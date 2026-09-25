import React, { useState } from 'react';
import {  Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { colors } from '../../../theme';

// Zod Schema for Validation
const requirementSchema = z.object({
  category: z.string().min(2, "Please enter a valid category (e.g., Plumber)"),
  location: z.string().min(5, "Please enter a complete address"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  budget: z.string().regex(/^\d+$/, "Budget must be a valid number"),
});

export function ClientRequirementsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [formData, setFormData] = useState({
    category: '',
    location: '',
    description: '',
    budget: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePostRequirement = () => {
    try {
      // Validate form
      const validData = requirementSchema.parse(formData);
      setErrors({});
      
      // Navigate to Radar Screen with the data
      navigation.navigate('ClientSearching', { requirementData: validData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        // FIX: Use .issues instead of .errors for strict TS compatibility
        error.issues.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(formattedErrors);
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What do you need help with?</Text>

      <Text style={styles.label}>Service Category (e.g., Electrician)</Text>
      <TextInput
        style={[styles.input, errors.category && styles.inputError]}
        placeholder="E.g., Plumber, Painter"
        placeholderTextColor="#666"
        value={formData.category}
        onChangeText={(text) => setFormData({ ...formData, category: text })}
      />
      {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

      <Text style={styles.label}>Location</Text>
      <TextInput
        style={[styles.input, errors.location && styles.inputError]}
        placeholder="Enter your full address"
        placeholderTextColor="#666"
        value={formData.location}
        onChangeText={(text) => setFormData({ ...formData, location: text })}
      />
      {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

      <Text style={styles.label}>Description of Work</Text>
      <TextInput
        style={[styles.input, styles.textArea, errors.description && styles.inputError]}
        placeholder="Describe the issue or project in detail..."
        placeholderTextColor="#666"
        multiline
        numberOfLines={4}
        value={formData.description}
        onChangeText={(text) => setFormData({ ...formData, description: text })}
      />
      {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}

      <Text style={styles.label}>Estimated Budget (₹)</Text>
      <TextInput
        style={[styles.input, errors.budget && styles.inputError]}
        placeholder="e.g. 500"
        placeholderTextColor="#666"
        keyboardType="numeric"
        value={formData.budget}
        onChangeText={(text) => setFormData({ ...formData, budget: text })}
      />
      {errors.budget && <Text style={styles.errorText}>{errors.budget}</Text>}

      <TouchableOpacity style={styles.button} onPress={handlePostRequirement}>
        <Text style={styles.buttonText}>Find Professionals Now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 30 },
  label: { color: '#fff', fontSize: 16, marginBottom: 8, fontWeight: '500' },
  input: {
    backgroundColor: '#1A1A1A', color: '#fff', padding: 15,
    borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333'
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  inputError: { borderColor: '#ff4444' },
  errorText: { color: '#ff4444', fontSize: 12, marginBottom: 15, marginTop: -5 },
  button: {
    backgroundColor: colors.primary, padding: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 20
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});