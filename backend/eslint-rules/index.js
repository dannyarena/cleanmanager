/**
 * Plugin ESLint custom per Clean Manager
 * Esporta tutte le regole custom
 */

module.exports = {
  rules: {
    'no-raw-sql': require('./no-raw-sql')
  }
};