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

  const getIconForCategory = (catName?: string) => {
    if (!catName) return 'package';
    const n = catName.toLowerCase();
    if (n.includes('mobile') || n.includes('phone')) return 'smartphone';
    if (n.includes('laptop') || n.includes('computer')) return 'monitor';
    if (n.includes('audio') || n.includes('headphone')) return 'headphones';
    if (n.includes('tv') || n.includes('television')) return 'tv';
    if (n.includes('watch')) return 'watch';
    if (n.includes('ac') || n.includes('conditioner') || n.includes('air')) return 'wind';
    if (n.includes('camera')) return 'camera';
    if (n.includes('accessory')) return 'paperclip';
    return 'box';
  }

  const iconName = getIconForCategory(categoryName) as keyof typeof Feather.glyphMap;
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
