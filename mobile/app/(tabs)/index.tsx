import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Modal, TextInput, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';

export default function IndexScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Wszystkie');

  const [modalVisible, setModalVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editLocation, setEditLocation] = useState('Spiżarnia');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);

  const PREDEFINED_LOCATIONS = ['Spiżarnia', 'Lodówka', 'Zamrażarka', 'Szafka', 'Łazienka', 'Piwnica'];
  const FILTER_OPTIONS = ['Wszystkie', ...PREDEFINED_LOCATIONS];

  // PAMIĘTAJ O SWOIM IP!
  const API_URL = 'http://192.168.8.156:8000/api/products/';

  const fetchProducts = async () => {
    try {
      // 1. Próbujemy pobrać z internetu (Django)
      const response = await axios.get(API_URL);
      setProducts(response.data);

      // ZAPIS OFFLINE: Jeśli się udało, zapisujemy kopię do pamięci telefonu/przeglądarki
      await AsyncStorage.setItem('offline_products', JSON.stringify(response.data));
    } catch (error) {
      console.error("Błąd sieci, wczytuję tryb offline:", error);

      // TRYB OFFLINE: Nie ma internetu! Próbujemy wyciągnąć starą kopię z pamięci
      const savedData = await AsyncStorage.getItem('offline_products');
      if (savedData) {
        setProducts(JSON.parse(savedData));
        Alert.alert("Tryb Offline", "Brak połączenia z serwerem. Wyświetlam zapisane dane.");
      } else {
        Alert.alert("Błąd", "Brak połączenia i brak zapisanych danych offline.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openAddModal = () => {
    setIsAddMode(true);
    setSelectedProductId(null);
    setEditName('');
    setEditQuantity('1');
    setEditLocation('Spiżarnia');
    setEditImageUri(null);
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setIsAddMode(false);
    setSelectedProductId(item.id);
    setEditName(item.name);
    setEditQuantity(item.quantity.toString());
    setEditLocation(item.location || 'Spiżarnia');
    setEditImageUri(item.image || null);
    setModalVisible(true);
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Odmowa", "Aplikacja potrzebuje dostępu do aparatu.");
      return;
    }
    let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setEditImageUri(result.assets[0].uri);
  };

  const pickImageFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Odmowa", "Aplikacja potrzebuje dostępu do galerii.");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setEditImageUri(result.assets[0].uri);
  };

  const saveChanges = async () => {
    if (!editName) {
      Alert.alert("Błąd", "Nazwa produktu nie może być pusta!");
      return;
    }

    const formData = new FormData();
    formData.append('name', editName);
    formData.append('quantity', editQuantity || '1');
    formData.append('location', editLocation);

    if (isAddMode) {
      const today = new Date().toISOString().split('T')[0];
      formData.append('owner', '1');
      formData.append('category', 'food');
      formData.append('expiry_date', today);
      formData.append('unit', 'szt');
    }

    if (editImageUri && !editImageUri.startsWith('http')) {
      const filename = editImageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      formData.append('image', { uri: editImageUri, name: filename, type: type } as any);
    }

    try {
      if (isAddMode) {
        await axios.post(API_URL, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert("Sukces", "Dodano nowy produkt!");
      } else {
        await axios.patch(`${API_URL}${selectedProductId}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert("Sukces", "Zaktualizowano produkt!");
      }
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error(error);
      Alert.alert("Błąd", "Nie udało się zapisać zmian w bazie.");
    }
  };

  const deleteProduct = (id: number = selectedProductId!) => {
    Alert.alert(
      "Usuń produkt",
      "Czy na pewno chcesz usunąć ten produkt z bazy?",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(`${API_URL}${id}/`);
              setModalVisible(false);
              fetchProducts();
            } catch (error) {
              console.error(error);
              Alert.alert("Błąd", "Nie udało się usunąć produktu.");
            }
          }
        }
      ]
    );
  };

  // --- NOWE: Szybka zmiana ilości z przycisków +/- ---
  const updateQuantity = async (item: any, change: number) => {
    const currentQuantity = parseFloat(item.quantity);
    const newQuantity = currentQuantity + change;

    if (newQuantity <= 0) {
      // Jeśli schodzimy do 0, od razu pytamy o usunięcie z bazy
      Alert.alert(
        "Produkt się skończył",
        `Ilość produktu "${item.name}" wynosi 0. Czy usunąć go z listy?`,
        [
          { text: "Zostaw 0", onPress: () => saveQuantityToServer(item.id, 0) },
          {
            text: "Usuń produkt",
            style: "destructive",
            onPress: async () => {
              try {
                await axios.delete(`${API_URL}${item.id}/`);
                fetchProducts();
              } catch (e) {
                console.error(e);
              }
            }
          }
        ]
      );
      return;
    }

    saveQuantityToServer(item.id, newQuantity);
  };

  const saveQuantityToServer = async (id: number, newQuantity: number) => {
    // Aktualizujemy stan lokalnie, żeby interfejs zareagował od razu (brak opóźnienia)
    setProducts(products.map(p => p.id === id ? { ...p, quantity: newQuantity } : p));

    try {
      const formData = new FormData();
      formData.append('quantity', newQuantity.toString());

      await axios.patch(`${API_URL}${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Błąd", "Wystąpił problem z połączeniem.");
      fetchProducts(); // Cofnij zmiany na liście w razie błędu serwera
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'Wszystkie' || product.location === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.thumbnail} />
      ) : (
        <View style={styles.placeholderThumbnail} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetailsLocation}>Lokalizacja: {item.location}</Text>

        {/* --- NOWE: Wiersz z ilością i przyciskami + / - --- */}
        <View style={styles.quantityRow}>
          <Text style={styles.productDetailsAmount}>Ilość: {item.quantity} {item.unit}</Text>
          <View style={styles.quickActionButtons}>
            <TouchableOpacity style={styles.quickButton} onPress={() => updateQuantity(item, -1)}>
              <Text style={styles.quickButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={() => updateQuantity(item, 1)}>
              <Text style={styles.quickButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Twój Inwentarz</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Dodaj</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Szukaj produktu..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTER_OPTIONS.map(option => (
            <TouchableOpacity
              key={option}
              style={[styles.filterChip, selectedFilter === option && styles.filterChipActive]}
              onPress={() => setSelectedFilter(option)}
            >
              <Text style={[styles.filterChipText, selectedFilter === option && styles.filterChipTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          onRefresh={fetchProducts}
          refreshing={loading}
          ListEmptyComponent={<Text style={styles.emptyText}>Brak produktów do wyświetlenia.</Text>}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isAddMode ? "Dodaj nowy produkt" : "Edytuj produkt"}</Text>

            <View style={styles.imageSection}>
              {editImageUri ? (
                <Image source={{ uri: editImageUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.imagePlaceholderBox}><Text style={styles.imagePickerText}>Brak zdjęcia</Text></View>
              )}
              <View style={styles.imageButtonsRow}>
                <TouchableOpacity style={styles.iconButton} onPress={takePhoto}><Text style={styles.iconButtonText}>📷 Aparat</Text></TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={pickImageFromGallery}><Text style={styles.iconButtonText}>🖼️ Galeria</Text></TouchableOpacity>
              </View>
            </View>

            <Text style={styles.label}>Nazwa:</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Wpisz nazwę..." />

            <Text style={styles.label}>Ilość:</Text>
            <TextInput style={styles.input} value={editQuantity} onChangeText={setEditQuantity} keyboardType="numeric" />

            <Text style={styles.label}>Lokalizacja:</Text>
            <View style={styles.locationsWrapper}>
              {PREDEFINED_LOCATIONS.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.locationChip, editLocation === loc && styles.locationChipActive]}
                  onPress={() => setEditLocation(loc)}
                >
                  <Text style={[styles.locationChipText, editLocation === loc && styles.locationChipTextActive]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveChanges}>
                <Text style={styles.buttonText}>Zapisz</Text>
              </TouchableOpacity>
            </View>

            {!isAddMode && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteProduct()}>
                <Text style={styles.buttonText}>🗑️ Usuń produkt</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 30 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  addButton: { backgroundColor: '#4CAF50', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  searchInput: { backgroundColor: 'white', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ddd', fontSize: 16, marginBottom: 15 },
  filterWrapper: { marginBottom: 15 },
  filterChip: { backgroundColor: '#e0e0e0', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginRight: 10 },
  filterChipActive: { backgroundColor: '#2196F3' },
  filterChipText: { color: '#555', fontSize: 14, fontWeight: '600' },
  filterChipTextActive: { color: 'white' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 30, fontSize: 16 },

  card: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 10, elevation: 2 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 15 },
  placeholderThumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 15, backgroundColor: '#ddd' },
  cardInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  productDetailsLocation: { fontSize: 13, color: '#888', marginTop: 2 },

  // --- STYLE DLA NOWYCH PRZYCISKÓW +/- ---
  quantityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  productDetailsAmount: { fontSize: 15, color: '#444', fontWeight: 'bold' },
  quickActionButtons: { flexDirection: 'row', gap: 10 },
  quickButton: { backgroundColor: '#f0f0f0', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  quickButtonText: { fontSize: 20, fontWeight: 'bold', color: '#555', lineHeight: 22 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15, backgroundColor: '#f9f9f9' },

  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#757575' },
  saveButton: { backgroundColor: '#4CAF50' },

  deleteButton: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },

  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  imageSection: { alignItems: 'center', marginBottom: 20 },
  previewImage: { width: 100, height: 100, borderRadius: 10, marginBottom: 10 },
  imagePlaceholderBox: { width: 100, height: 100, borderRadius: 10, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  imagePickerText: { color: '#888', fontWeight: 'bold' },
  imageButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  iconButton: { backgroundColor: '#e0e0e0', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20 },
  iconButtonText: { fontSize: 14, fontWeight: 'bold', color: '#333' },

  locationsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  locationChip: { backgroundColor: '#e0e0e0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  locationChipActive: { backgroundColor: '#4CAF50', borderColor: '#388E3C' },
  locationChipText: { color: '#555', fontSize: 14 },
  locationChipTextActive: { color: 'white', fontWeight: 'bold' }
});