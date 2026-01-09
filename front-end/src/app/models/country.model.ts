export interface Country {
  name: {
    common: string;
    official: string;
  };
  cca2: string; // Código de país de 2 letras
  cca3: string; // Código de país de 3 letras
  idd: {
    root: string;
    suffixes: string[];
  };
  flags: {
    png: string;
    svg: string;
  };
}

export interface CountryCode {
  code: string; // Código telefónico completo (ej: +57)
  country: string; // Nombre del país
  flag: string; // URL de la bandera
  iso2: string; // Código ISO de 2 letras
}
