export interface IdType {
  idInternal: number;
  name: string;
  code: string;
  isCompany: boolean;
  nature: string;
  calculateDigit: boolean;
  regex?: string | null;
}

export const ID_TYPES: IdType[] = [
  { idInternal: 10, name: 'Registro civil de Nacimiento', code: '11', isCompany: false, nature: 'Natural', calculateDigit: true, regex: null },
  { idInternal: 13, name: 'Tarjeta de Identidad', code: '12', isCompany: false, nature: 'Natural', calculateDigit: true, regex: null },
  { idInternal: 13, name: 'Cédula de Ciudadanía', code: '13', isCompany: false, nature: 'Natural', calculateDigit: true, regex: '^[0-9]*$' },
  { idInternal: 12, name: 'Tarjeta de extranjería', code: '21', isCompany: false, nature: 'Natural', calculateDigit: false, regex: null },
  { idInternal: 4, name: 'Cédula de extranjería', code: '22', isCompany: false, nature: 'Natural', calculateDigit: false, regex: null },
  { idInternal: 8, name: 'NIT', code: '31', isCompany: true, nature: 'Juridica,Natural', calculateDigit: true, regex: '^[0-9]*$' },
  { idInternal: 9, name: 'Pasaporte', code: '41', isCompany: false, nature: 'Natural', calculateDigit: false, regex: null },
  { idInternal: 5, name: 'Documento de identificación extranjero', code: '42', isCompany: false, nature: 'Juridica,Natural', calculateDigit: false, regex: null },
  { idInternal: 15, name: 'PEP', code: '47', isCompany: false, nature: 'Natural', calculateDigit: false, regex: null },
  { idInternal: 18, name: 'RPT (Permiso Protección Temporal)', code: '48', isCompany: false, nature: 'Natural', calculateDigit: false, regex: null },
  { idInternal: 16, name: 'Otro de otro país', code: '50', isCompany: false, nature: 'Juridica', calculateDigit: false, regex: null },
  { idInternal: 17, name: 'NUP', code: '91', isCompany: false, nature: 'Natural', calculateDigit: true, regex: null }
];
