export const environment = {
  production: true,
  // Nginx redirige /api vers le conteneur backend
  apiUrl: '/api',
  /** Devise d'affichage des tarifs : garder la même que PAYMENT_CURRENCY du backend */
  currency: 'tnd',
};
