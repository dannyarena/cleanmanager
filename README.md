# 🧹 Clean Manager

Un'applicazione moderna per la gestione e pulizia, costruita con React, TypeScript e Vite.

## 🚀 Caratteristiche

- ⚡ **Vite** - Build tool veloce e moderno
- ⚛️ **React 18** - Libreria UI con le ultime funzionalità
- 🔷 **TypeScript** - Tipizzazione statica per maggiore sicurezza
- 🎨 **CSS Moderno** - Variabili CSS e design responsivo
- 📝 **ESLint** - Linting per mantenere la qualità del codice
- 🔧 **Configurazione pronta** - Setup completo per iniziare subito

## 📋 Prerequisiti

Assicurati di avere installato:

- [Node.js](https://nodejs.org/) (versione 16 o superiore)
- [npm](https://www.npmjs.com/) o [yarn](https://yarnpkg.com/)

## 🛠️ Installazione

1. Clona il repository:
```bash
git clone <url-del-repository>
cd cleanmanager
```

2. Installa le dipendenze:
```bash
npm install
# oppure
yarn install
```

## 🏃‍♂️ Avvio del progetto

### Modalità sviluppo
```bash
npm run dev
# oppure
yarn dev
```

L'applicazione sarà disponibile su [http://localhost:3000](http://localhost:3000)

### Build per produzione
```bash
npm run build
# oppure
yarn build
```

### Anteprima build di produzione
```bash
npm run preview
# oppure
yarn preview
```

## 🧪 Script disponibili

- `npm run dev` - Avvia il server di sviluppo
- `npm run build` - Crea la build di produzione
- `npm run preview` - Anteprima della build di produzione
- `npm run lint` - Esegue ESLint per controllare il codice
- `npm run lint:fix` - Corregge automaticamente gli errori ESLint
- `npm run type-check` - Controlla i tipi TypeScript

## 📁 Struttura del progetto

```
cleanmanager/
├── public/
│   └── vite.svg
├── src/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .eslintrc.cjs
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## 🎨 Personalizzazione

### Variabili CSS
Il progetto utilizza variabili CSS personalizzate definite in `src/index.css`:

```css
:root {
  --primary-color: #646cff;
  --primary-hover: #535bf2;
  --border-radius: 8px;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### Alias di percorso
È configurato l'alias `@` per puntare alla cartella `src`:

```typescript
import Component from '@/components/Component'
```

## 🔧 Configurazione

### Vite
La configurazione di Vite si trova in `vite.config.ts` e include:
- Plugin React
- Alias di percorso
- Configurazione del server di sviluppo
- Opzioni di build

### TypeScript
Il progetto è configurato con TypeScript strict mode per massima sicurezza dei tipi.

### ESLint
ESLint è configurato con regole per React e TypeScript per mantenere la qualità del codice.

## 🤝 Contribuire

1. Fai un fork del progetto
2. Crea un branch per la tua feature (`git checkout -b feature/AmazingFeature`)
3. Committa le tue modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Pusha sul branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è sotto licenza MIT. Vedi il file `LICENSE` per maggiori dettagli.

## 🆘 Supporto

Se hai domande o problemi, apri una issue nel repository.

---

**Buon coding! 🚀**