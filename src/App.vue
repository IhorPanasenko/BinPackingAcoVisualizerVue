<template>
  <div id="app-layout">

    <aside class="sidebar">
      <h2>Параметри</h2>

      <div class="control-group">
        <button @click="startStopAlgorithm" :class="{ 'running': isRunning }">
          {{ isRunning ? 'Зупинити' : 'Запустити' }}
        </button>
      </div>
      <div class="control-group">
        <h3>Налаштування візуалізації</h3>
        <div class="input-row">
          <label>Затримка (мс): {{ visualDelay }}</label>
          <input 
            type="range" 
            min="0" 
            max="2000" 
            step="10" 
            v-model.number="visualDelay" 
            style="width: 120px;"
          >
        </div>
      </div>
      <div class="control-group">
        <h3>Параметри алгоритму</h3>
        <div class="input-row">
          <label>Мурахи:</label>
          <input type="number" v-model.number="options.numAnts" :disabled="isRunning">
        </div>
        <div class="input-row">
          <label>Ітерації:</label>
          <input type="number" v-model.number="options.numIterations" :disabled="isRunning">
        </div>
        <div class="input-row">
          <label>Alpha (α):</label>
          <input type="number" step="0.1" v-model.number="options.alpha" :disabled="isRunning">
        </div>
        <div class="input-row">
          <label>Beta (β):</label>
          <input type="number" step="0.1" v-model.number="options.beta" :disabled="isRunning">
        </div>
        <div class="input-row">
          <label>Rho (ρ):</label>
          <input type="number" step="0.01" v-model.number="options.rho" :disabled="isRunning">
        </div>
        <div class="input-row">
          <label>W (Ранг):</label>
          <input type="number" v-model.number="options.rankWeight" :disabled="isRunning">
        </div>
      </div>

      <div class="control-group">
        <h3>Предмети (Місткість: {{ binCapacity }})</h3>
        <div class="input-row">
          <label>Місткість:</label>
          <input type="number" v-model.number="binCapacity" :disabled="isRunning">
        </div>
        <div class="item-actions">
          <button @click="generateItems" :disabled="isRunning">Згенерувати</button>
          <input type="number" v-model.number="generateCount" :disabled="isRunning" style="width: 50px;">
          <button @click="addItem" :disabled="isRunning">Додати</button>
        </div>
        
        <div class="item-list">
          <div v-for="(item, index) in items" :key="item.id" class="item-row">
            <span>ID: {{ item.id }}</span>
            <input 
              type="number" 
              v-model.number="item.weight" 
              :disabled="isRunning"
              @change="validateItemWeight(item)"
            >
            <button @click="removeItem(index)" :disabled="isRunning">×</button>
          </div>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <section class="visual-section">
        <h2>Найкраще знайдене пакування (Глобально: {{ globalBest?.numBins ?? 'N/A' }} бінів)</h2>
        <div class="bin-grid-container">
          <SingleBin 
            v-for="bin in globalBest?.bins" 
            :key="bin.id"
            :bin="bin"
            :bin-capacity="binCapacity" 
          />
          <div v-if="!globalBest && !isRunning" class="placeholder-text">
            Натисніть "Запустити" для початку
          </div>
        </div>
      </section>

      <section class="visual-section double-panel">
        <div>
          <h2>Графік збіжності (Ітерація: {{ currentIteration }})</h2>
          <ConvergenceChart 
            :iteration="currentIteration"
            :globalBestBins="globalBest?.numBins ?? null"
            :iterationBestBins="iterationBest?.numBins ?? null"
            :is-running="isRunning"
          />
        </div>
        <div class="heatmap-wrapper">
          <h2>Теплова карта феромонів</h2>
          <PheromoneHeatmap :pheromones="pheromones" :items="items" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue';
import type { Item, AcoOptions, Solution } from '@/types';
import { AsRankAlgorithm } from '@/core/AsRankAlgorithm';
import SingleBin from '@/components/SingleBin.vue';
import PheromoneHeatmap from '@/components/PheromoneHeatmap.vue';
import ConvergenceChart from '@/components/ConvergenceChart.vue';

// --- Стан (State) ---

// Параметри задачі
const binCapacity = ref(10);
const items = ref<Item[]>([
  { id: 0, weight: 7 },
  { id: 1, weight: 5 },
  { id: 2, weight: 4 },
  { id: 3, weight: 3 },
]);
const generateCount = ref(10);
let nextItemId = 4;

// Параметри алгоритму
const options = reactive<AcoOptions>({
  numAnts: 20,
  numIterations: 200,
  alpha: 1.0,
  beta: 2.0,
  rho: 0.1,
  rankWeight: 6, // W = 6 найкращих мурах
});

// Стан виконання
const isRunning = ref(false);
const currentIteration = ref(0);
const visualDelay = ref<number>(50);
let acoInstance: AsRankAlgorithm | null = null;

// Результати та візуалізація
const pheromones = ref<number[][]>([]);
const globalBest = ref<Solution | null>(null);
const iterationBest = ref<Solution | null>(null);

// --- Керування предметами (CRUD) ---

const generateItems = () => {
  items.value = [];
  nextItemId = 0;
  for (let i = 0; i < generateCount.value; i++) {
    const weight = Math.floor(Math.random() * (binCapacity.value - 1)) + 1; // Вага від 1 до (Місткість-1)
    items.value.push({ id: nextItemId++, weight: weight });
  }
};

const addItem = () => {
  items.value.push({ id: nextItemId++, weight: Math.floor(binCapacity.value / 2) });
};

const removeItem = (index: number) => {
  items.value.splice(index, 1);
};

const validateItemWeight = (item: Item) => {
  if (item.weight > binCapacity.value) {
    alert(`Вага предмета (ID: ${item.id}) не може бути більшою за місткість біна (${binCapacity.value})`);
    item.weight = binCapacity.value;
  }
  if (item.weight < 1) {
    item.weight = 1;
  }
};

// --- Керування алгоритмом ---

const startStopAlgorithm = () => {
  if (isRunning.value) {
    // Зупинити
    isRunning.value = false;
  } else {
    // Почати
    if (items.value.length < 2) {
      alert("Додайте принаймні 2 предмети");
      return;
    }
    
    // Скидання стану
    isRunning.value = true;
    currentIteration.value = 0;
    globalBest.value = null;
    iterationBest.value = null;
    pheromones.value = [];
    
    // Створюємо та ініціалізуємо алгоритм
    acoInstance = new AsRankAlgorithm(options, items.value, binCapacity.value, pheromones);
    acoInstance.initialize();
    
    // Запускаємо цикл
    runGameLoop();
  }
};

const runGameLoop = async () => {
  // Умова зупинки (кнопка або кінець ітерацій)
  if (!isRunning.value || currentIteration.value >= options.numIterations) {
    isRunning.value = false;
    return;
  }
  
  // 1. Робимо один крок
  const { global, iteration } = acoInstance!.runIteration();
  
  // 2. Оновлюємо стан (це запустить візуалізацію)
  globalBest.value = global;
  iterationBest.value = iteration;
  currentIteration.value++;
  
  // 3. Даємо Vue "подих" (0мс) щоб оновити UI
  await nextTick();
  
  // 4. Плануємо наступний крок (рекурсія)
  // Використовуємо 'requestAnimationFrame' для плавності
  setTimeout(runGameLoop, visualDelay.value)
};

</script>

<style>
/* Глобальні стилі */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f4f7f6;
  color: #333;
  margin: 0;
}
input[type="number"] {
  width: 60px;
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #ccc;
}
button {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}
button:hover {
  background-color: #2980b9;
}
button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

/* Лейаут */
#app-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 350px;
  background-color: #fff;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  overflow-y: auto;
  flex-shrink: 0;
}

.main-content {
  flex-grow: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f9f9f9;
}

/* Сайдбар */
.control-group {
  margin-bottom: 20px;
  border-bottom: 1px solid #eee;
  padding-bottom: 20px;
}
.control-group h3 {
  margin-top: 0;
}
button.running {
  background-color: #e74c3c;
}
button.running:hover {
  background-color: #c0392b;
}

.input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.item-actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.item-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #ddd;
  padding: 5px;
  border-radius: 4px;
}
.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px;
  border-bottom: 1px solid #eee;
}
.item-row:last-child {
  border-bottom: none;
}
.item-row input {
  width: 70px;
}
.item-row button {
  background-color: #e74c3c;
  padding: 0 8px;
  font-weight: bold;
}

/* Головний контент */
.visual-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.double-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.bin-grid-container {
  display: grid;
  gap: 15px;
  grid-template-columns: repeat(auto-fill, 130px);
  text-align: center;
  color: #888;
  align-self: center;
}
.heatmap-wrapper {
  margin-left: 20px;
}
</style>