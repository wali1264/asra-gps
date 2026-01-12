
export enum PaperSize {
  A4 = 'A4',
  A5 = 'A5'
}

export type TextAlignment = 'L' | 'C' | 'R';

export interface ContractField {
  id: string;
  label: string;
  key: string;
  isActive: boolean;
  x: number; // Percent 0-100
  y: number; // Percent 0-100
  width: number;
  height: number;
  fontSize: number;
  rotation: number;
  alignment: TextAlignment;
}

export interface ContractPage {
  pageNumber: number;
  bgImage?: string;
  paperSize: PaperSize;
  fields: ContractField[];
  showBackgroundInPrint: boolean;
}

export interface ContractTemplate {
  id: string;
  pages: ContractPage[];
}

export interface ClientProfile {
  id: string;
  name: string;
  fatherName: string;
  tazkira: string;
  phone: string;
  createdAt: string;
}
