import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

const Splash = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Malloya Tasks</Text>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0077b6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
