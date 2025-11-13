<template>
  <div class="chart-container">
    <canvas ref="canvasEl"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw, watch } from 'vue';
import Chart from 'chart.js/auto';
import type { Chart as ChartInstance } from 'chart.js/auto';

const props = defineProps<{
  iteration: number;
  globalBestBins: number | null;
  iterationBestBins: number | null;
  isRunning: boolean;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
// ВАЖЛИВО: Зберігаємо 'chartInstance' поза 'ref', але використовуємо 'markRaw'
let chartInstance: ChartInstance | null = null;

const createChart = () => {
  if (chartInstance) {
    chartInstance.destroy();
  }
  const canvas = canvasEl.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = {
    labels: [],
    datasets: [
      {
        label: 'Найкращий (Ітерація)',
        data: [],
        borderColor: 'rgba(54, 162, 235, 0.5)',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Найкращий (Глобально)',
        data: [],
        borderColor: 'rgba(231, 76, 60, 1)',
        fill: false,
        tension: 0.1
      }
    ]
  };

  // Використовуємо 'markRaw' щоб Vue не робив графік реактивним
  chartInstance = markRaw(new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      scales: { y: { beginAtZero: false, ticks: { stepSize: 1 } } },
      animation: false, // Вимикаємо анімацію для швидкості
    }
  }));
};

// Оновлюємо графік
watch(() => props.iteration, (newIteration) => {
  if (!chartInstance || !props.isRunning) return;
  
  chartInstance.data.labels?.push(newIteration.toString());
  (chartInstance.data.datasets[0].data as number[]).push(props.iterationBestBins!);
  (chartInstance.data.datasets[1].data as number[]).push(props.globalBestBins!);
  
  chartInstance.update();
});

// Скидаємо графік, коли запуск зупиняється (або починається)
watch(() => props.isRunning, (running) => {
  if (running) {
    createChart(); // Створити новий графік при старті
  }
});

onMounted(createChart);
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
  background-color: #fafafa;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px;
}
</style>