import { ValueTransformer } from 'typeorm';

/** MySQL renvoie les colonnes DECIMAL sous forme de chaîne : on les relit en nombre. */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};
