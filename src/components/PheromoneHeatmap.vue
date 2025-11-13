<template>
  <div class="heatmap-container">
    <canvas ref="canvasEl" width="400" height="400"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { Item } from '@/types';

const props = defineProps<{
  pheromones: number[][];
  items: Item[];
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);

// === НОВІ ЗМІННІ ===
const margin = { top: 35, right: 5, bottom: 5, left: 35 }; // Залишаємо місце для підписів

const draw = () => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  
  const p = props.pheromones;
  const items = props.items;
  
  if (!p || p.length === 0 || items.length === 0) {
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Феромони не ініціалізовано', width / 2, height / 2);
    return;
  }
  
  // Знаходимо min/max для нормалізації
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < items.length; j++) {
      if (i === j) continue;
      const val = p[items[i].id]?.[items[j].id];
      if (val === undefined) continue;
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  if (!isFinite(min) || !isFinite(max)) {
    min = 0.1; max = 1.0; 
  }
  if (min === max) max += 0.1;

  // === ЗМІНЕНА ЛОГІКА РОЗМІРІВ ===
  // Розраховуємо розмір клітинки на основі вільного місця
  const numItems = items.length;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const cellSize = Math.min(plotWidth / numItems, plotHeight / numItems);

  ctx.font = `${Math.max(8, Math.min(12, cellSize / 4))}px Arial`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  // === ОСІ X та Y (НОВИЙ БЛОК) ===
  ctx.fillStyle = '#333';
  ctx.font = 'bold 12px Arial';
  
  // Підписи осі Y (зліва)
  for (let i = 0; i < numItems; i++) {
    const item = items[i];
    const yPos = margin.top + (i + 0.5) * cellSize;
    ctx.fillText(item.weight.toString(), margin.left / 2, yPos); // Показуємо вагу
  }
  // Підпис "Від" (Y-axis label)
  ctx.save();
  ctx.translate(10, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Від (Вага)", 0, 0);
  ctx.restore();

  // Підписи осі X (зверху)
  for (let j = 0; j < numItems; j++) {
    const item = items[j];
    const xPos = margin.left + (j + 0.5) * cellSize;
    ctx.fillText(item.weight.toString(), xPos, margin.top / 2); // Показуємо вагу
  }
  // Підпис "До" (X-axis label)
  ctx.fillText("До (Вага)", width / 2 + margin.left / 2, 10);
  // --- Кінець блоку осей ---


  // === ЛОГІКА РЕШТІ (ЗІ ЗМІЩЕННЯМ) ===
  for (let i = 0; i < numItems; i++) {
    for (let j = 0; j < numItems; j++) {
      const id_i = items[i].id;
      const id_j = items[j].id;

      // Рахуємо X та Y позицію зі зміщенням
      const x = margin.left + j * cellSize;
      const y = margin.top + i * cellSize;

      if (id_i === id_j) {
        ctx.fillStyle = '#ccc';
      } else {
        const value = p[id_i]?.[id_j] || min;
        const normValue = (value - min) / (max - min); 
        const hue = 240 * (1 - normValue);
        const lightness = 30 + (normValue * 40);
        ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
      }
      ctx.fillRect(x, y, cellSize, cellSize); // Малюємо зі зміщенням

      // Малюємо текст (зі зміщенням)
      if (id_i !== id_j) {
        const value = p[id_i]?.[id_j] || min;
        const normValue = (value - min) / (max - min);
        
        ctx.fillStyle = normValue > 0.6 ? 'black' : 'white';
        ctx.fillText(
          value.toFixed(2), 
          x + 0.5 * cellSize, // X зі зміщенням
          y + 0.5 * cellSize  // Y зі зміщенням
        );
      }
    }
  }
};

watch(() => props.pheromones, draw, { deep: true });
onMounted(draw);
</script>

<style scoped>
/* Стилі залишаються без змін */
.heatmap-container {
  width: 400px;
  height: 400px;
  background-color: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
}
canvas {
  width: 400px;
  height: 400px;
}
</style>