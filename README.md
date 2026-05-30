# SombraIA Frontend

Aplicación móvil de SombraIA construida con React Native y Expo.

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- App **Expo Go** en tu dispositivo móvil ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npx expo start
```

Luego elige cómo correr la app:

| Tecla | Acción |
|-------|--------|
| `a`   | Abrir en emulador Android |
| `i`   | Abrir en simulador iOS |
| `w`   | Abrir en navegador web |
| QR    | Escanear con Expo Go en tu celular |

## Estructura del proyecto

```
SombraIA-Frontend/
├── App.js          # Pantalla principal
├── index.js        # Entry point
├── app.json        # Configuración de la app
├── assets/         # Imágenes, íconos y recursos estáticos
├── package.json
└── node_modules/
```

## Scripts disponibles

```bash
npx expo start          # Inicia el servidor de desarrollo
npx expo start --clear  # Inicia limpiando la caché
npx expo build          # Genera build de producción
```
