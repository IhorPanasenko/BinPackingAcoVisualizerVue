// Описує один предмет
export interface Item {
  id: number;
  weight: number;
}

// Описує один заповнений бін
export interface Bin {
  id: number;
  items: Item[];
  currentLoad: number;
}

// Описує параметри алгоритму
export interface AcoOptions {
  numAnts: number;
  numIterations: number;
  alpha: number; // Вага феромону
  beta: number;  // Вага евристики
  rho: number;   // Коефіцієнт випаровування
  rankWeight: number; // Кількість мурах, що оновлюють (W у AS-Rank)
}

// Описує одне повне рішення (для однієї мурахи)
export interface Solution {
  order: Item[];
  bins: Bin[];
  numBins: number;
}