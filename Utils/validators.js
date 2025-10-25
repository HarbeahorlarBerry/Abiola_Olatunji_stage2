// src/utils/validators.js
export const validateCountry = (country) => {
  const errors = {};

  if (!country.name) errors.name = "is required";
  if (!country.population) errors.population = "is required";
  if (!country.currency_code) errors.currency_code = "is required";

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
};
