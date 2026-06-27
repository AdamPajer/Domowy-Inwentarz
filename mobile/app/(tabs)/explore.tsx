import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';


// ⚠️ PAMIĘTAJ O SWOIM IP (takim samym jak w index.tsx)
const API_URL = 'http://192.168.8.156:8000/api/products/';

interface Product {
  id: number;
  name: string;
  quantity: number;
  location?: string;
}

export default function ShoppingListScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedItems, setCheckedItems] = useState<number[]>([]); // Przechowuje ID odznaczonych produktów

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_URL);
      setProducts(response.data);
      await AsyncStorage.setItem('offline_products', JSON.stringify(response.data));
    } catch (error) {
      console.log("Lista zakupów działa w trybie offline");
      const savedData = await AsyncStorage.getItem('offline_products');
      if (savedData) {
        setProducts(JSON.parse(savedData));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Przełączanie stanu "kupione/odhaczone" w sklepie
  const toggleCheck = (id: number) => {
    if (checkedItems.includes(id)) {
      setCheckedItems(checkedItems.filter(item => item !== id));
    } else {
      setCheckedItems([...checkedItems, id]);
    }
  };

  // FILTR: Wybieramy tylko produkty, których ilość spadła do 0
  const shoppingList = products.filter(product => Number(product.quantity) === 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🛒 Lista Zakupów</Text>
        <Text style={styles.headerSubtitle}>Produkty, które się skończyły (ilość = 0)</Text>
      </View>

      <FlatList
        data={shoppingList}
        keyExtractor={(item) => item.id.toString()}
        // Dzięki temu lista rozciągnie się na cały ekran, by wyśrodkować pusty komunikat
        contentContainerStyle={shoppingList.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}

        // TO JEST KLUCZOWE: Komunikat, gdy lista jest pusta (wbudowany we FlatList)
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
            <Text style={styles.emptyText}>Wszystko masz pod dostatkiem!</Text>
            <Text style={styles.emptySubtext}>Odśwież, przeciągając palcem w dół.</Text>
          </View>
        }

        renderItem={({ item }) => {
          const isChecked = checkedItems.includes(item.id);
          return (
            <TouchableOpacity
              style={[styles.card, isChecked && styles.cardChecked]}
              onPress={() => toggleCheck(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.row}>
                <Ionicons
                  name={isChecked ? "checkbox" : "square-outline"}
                  size={24}
                  color={isChecked ? "#4CAF50" : "#757575"}
                />
                <View style={styles.textContainer}>
                  <Text style={[styles.productName, isChecked && styles.textChecked]}>
                    {item.name}
                  </Text>
                  {item.location && (
                    <Text style={styles.productLocation}>📍 {item.location}</Text>
                  )}
                </View>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Kupić</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginBottom: 8 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 14, color: '#757575', marginTop: 4 },
  card: { backgroundColor: '#ffffff', padding: 16, marginHorizontal: 16, marginVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  cardChecked: { backgroundColor: '#e8f5e9', borderColor: '#a5d6a7', borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  textContainer: { marginLeft: 12, flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#212121' },
  textChecked: { textDecorationLine: 'line-through', color: '#757575' },
  productLocation: { fontSize: 12, color: '#757575', marginTop: 2 },
  badge: { backgroundColor: '#ff9800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#757575', marginTop: 8, textAlign: 'center' },
});