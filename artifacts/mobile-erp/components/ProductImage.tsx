/**
 * ProductImage — Displays product image with smart fallback chain:
 * 1. Product's own image_uri
 * 2. Category-based fallback image from Unsplash
 * 3. Category icon (Feather)
 */
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { CATEGORY_IMAGES } from '@/database/seedData';

interface ProductImageProps {
  imageUri?: string | null;
  categoryName?: string;
  categoryIcon?: string;
  size?: number;
  borderRadius?: number;
  backgroundColor?: string;
  iconColor?: string;
}

export function ProductImage({
  imageUri,
  categoryName,
  categoryIcon,
  size = 48,
  borderRadius = 10,
  backgroundColor = '#1E293B',
  iconColor = '#60A5FA',
}: ProductImageProps) {
  const [imgError, setImgError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  // Try product-specific image
  const hasProductImage = imageUri && !imgError;
  // Fallback to category image
  const categoryImage = categoryName ? CATEGORY_IMAGES[categoryName] : null;
  const hasCategoryImage = categoryImage && !fallbackError && !hasProductImage;

  if (hasProductImage) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[styles.img, { width: size, height: size, borderRadius }]}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
    );
  }

  if (hasCategoryImage) {
    return (
      <Image
        source={{ uri: categoryImage }}
        style={[styles.img, { width: size, height: size, borderRadius }]}
        resizeMode="cover"
        onError={() => setFallbackError(true)}
      />
    );
  }

  // Final fallback: category icon
  const iconName = (categoryIcon || 'package') as keyof typeof Feather.glyphMap;
  return (
    <View style={[styles.iconBox, { width: size, height: size, borderRadius, backgroundColor }]}>
      <Feather name={iconName} size={size * 0.45} color={iconColor} />
    </View>
  );
}

/**
 * Get the best image URI for a product (for external use like PDF, sharing)
 */
export function getProductImageUri(imageUri?: string | null, categoryName?: string): string | null {
  if (imageUri) return imageUri;
  if (categoryName && CATEGORY_IMAGES[categoryName]) return CATEGORY_IMAGES[categoryName];
  return null;
}

const styles = StyleSheet.create({
  img: {
    backgroundColor: '#1A1F2E',
  },
  iconBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
