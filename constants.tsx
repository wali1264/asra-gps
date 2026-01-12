
import { PaperSize, ContractField } from './types';

export const PAPER_DIMENSIONS = {
  [PaperSize.A4]: { width: 210, height: 297 }, // mm
  [PaperSize.A5]: { width: 148, height: 210 }  // mm
};

export const INITIAL_FIELDS: ContractField[] = [
  { id: '1', label: 'نام بیمار', key: 'patientName', isActive: true, x: 35, y: 48, width: 150, height: 30, fontSize: 14, rotation: 0, alignment: 'R' },
  { id: '2', label: 'سن', key: 'age', isActive: true, x: 60, y: 48, width: 50, height: 30, fontSize: 14, rotation: 0, alignment: 'C' },
  { id: '3', label: 'تاریخ', key: 'date', isActive: true, x: 78, y: 48, width: 100, height: 30, fontSize: 14, rotation: 0, alignment: 'C' },
  { id: '4', label: 'اقلام دارویی (لیست داروها)', key: 'prescription', isActive: true, x: 55, y: 58, width: 300, height: 100, fontSize: 14, rotation: 0, alignment: 'R' }
];
