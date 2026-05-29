/**
 * Simple Error Boundary component
 */
import React, { Component, PropsWithChildren } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type Props = PropsWithChildren<{}>;
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ error: null })}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D1117', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 },
  message: { fontSize: 14, color: '#8B949E', textAlign: 'center', marginBottom: 20 },
  button: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#3B82F6', borderRadius: 10 },
  buttonText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
