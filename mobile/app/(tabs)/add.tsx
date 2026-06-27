import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

export default function AddScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- NOWE STANY DLA FORMULARZA ---
  const [showForm, setShowForm] = useState(false);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('Spiżarnia');

  // PAMIĘTAJ O SWOIM IP (musi być zgodne z ipconfig)
  const BACKEND_URL = 'https://adampajer.pythonanywhere.com/api/products/';

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Brak uprawnień do aparatu</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Daj uprawnienia</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Funkcja skanująca (krok 1: pobierz nazwę z API i pokaż formularz)
  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const result = await response.json();

      if (result.status === 1) {
        // Jeśli znajdziemy produkt, wpisujemy jego nazwę i pokazujemy nasz nowy formularz
        setProductName(result.product.product_name || "Nieznany produkt");
        setShowForm(true);
      } else {
        Alert.alert("Nieznany kod", "Nie znaleziono produktu. Spróbuj inny kod.");
        setScanned(false);
      }
    } catch (error) {
      Alert.alert("Błąd", "Brak połączenia z bazą kodów.");
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };

  // Funkcja wysyłająca (krok 2: wyślij to, co wpisał użytkownik)
  const submitToDjango = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      await axios.post(BACKEND_URL, {
        name: productName,
        quantity: parseFloat(quantity) || 1, // Zmieniamy wpisany tekst na liczbę
        unit: 'szt',
        category: 'food',
        expiry_date: today,
        location: location, // Używamy lokalizacji z formularza
        owner: 1
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      Alert.alert("Sukces", `Dodano do: ${location}`);

      // Zamykamy formularz i resetujemy skaner
      setShowForm(false);
      setScanned(false);
      setQuantity('1'); // Reset ilości na następny raz
    } catch (error) {
      console.error(error);
      Alert.alert("Błąd", "Nie udało się zapisać produktu w Django.");
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "qr"] }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
             {loading && <ActivityIndicator size="large" color="#4CAF50" />}
          </View>
          <Text style={styles.info}>
            {loading ? "Szukam w bazie..." : "Zeskanuj kod produktu"}
          </Text>
        </View>
      </CameraView>

      {/* --- WYSKAKUJĄCY FORMULARZ (MODAL) --- */}
      <Modal visible={showForm} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <Text style={styles.modalTitle}>Dodaj produkt</Text>

            <Text style={styles.label}>Nazwa produktu:</Text>
            <TextInput
              style={[styles.input, {backgroundColor: '#e0e0e0', color: '#555'}]}
              value={productName}
              editable={false} // Zablokowane do edycji, bo nazwa jest z bazy
            />

            <Text style={styles.label}>Ilość:</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric" // Odpala klawiaturę numeryczną
            />

            <Text style={styles.label}>Lokalizacja:</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowForm(false); setScanned(false); }}>
                <Text style={styles.buttonText}>Anuluj</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={submitToDjango}>
                <Text style={styles.buttonText}>Zapisz</Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  text: { color: 'white', textAlign: 'center', marginTop: 50 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  scanFrame: { width: 280, height: 200, borderWidth: 2, borderColor: '#4CAF50', borderRadius: 15, justifyContent: 'center' },
  info: { color: 'white', marginTop: 30, fontWeight: 'bold', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },
  button: { backgroundColor: '#2E7D32', padding: 15, margin: 20, borderRadius: 10 },

  // --- STYLE DLA MODALA (FORMULARZA) ---
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16, backgroundColor: '#f9f9f9' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalButton: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 },
  cancelButton: { backgroundColor: '#f44336' },
  saveButton: { backgroundColor: '#4CAF50' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});