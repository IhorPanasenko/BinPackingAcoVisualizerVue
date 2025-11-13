<template>
  <div class="single-bin">
    <canvas ref="canvasEl" width="120" height="200"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { PropType } from 'vue';
import type { Bin, Item } from '@/types';

// Цей компонент отримує один бін і малює його
const props = defineProps({
  bin: {
    type: Object as PropType<Bin>,
    required: true
  },
  binCapacity: {
    type: Number,
    required: true
  }
});

const canvasEl = ref<HTMLCanvasElement | null>(null);

// Кеш кольорів (щоб предмети мали однаковий колір)
const colors = new Map<number, string>();
const getColor = (id: number): string => {
  if (!colors.has(id)) {
    const hue = (id * 137.5) % 360; // Використовуємо золотий кут
    colors.set(id, `hsl(${hue}, 70%, 60%)`);
  }
  return colors.get(id)!;
};

const draw = () => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const binHeight = height - 40; // Залишаємо місце для тексту зверху/знизу
  const binWidth = width - 10; // Відступи 5px
  const startY = height - 20;
  const startX = 5;
  
  // Малюємо контур біна
  ctx.strokeStyle = '#333';
  ctx.strokeRect(startX, 20, binWidth, binHeight);

  // Малюємо предмети
  let currentY = startY;
  for (const item of props.bin.items) {
    const itemHeight = (item.weight / props.binCapacity) * binHeight;
    
    // Прямокутник предмета
    ctx.fillStyle = getColor(item.id);
    ctx.fillRect(startX, currentY - itemHeight, binWidth, itemHeight);
    
    // Текст (вага предмета)
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.weight.toString(), binWidth / 2 + startX, currentY - itemHeight / 2);

    currentY -= itemHeight;
  }

  // Малюємо ID біна та загальну вагу
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.font = '12px Arial';
  ctx.fillText(`Бін #${props.bin.id + 1}`, width / 2, 12);
  ctx.font = '11px Arial';
  ctx.fillText(`(${props.bin.currentLoad} / ${props.binCapacity})`, width / 2, height - 8);
};

// Перемальовуємо, коли змінюються дані
watch(() => props.bin, draw, { deep: true });
onMounted(draw);
</script>

<style scoped>
.single-bin {
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fdfdfd;
}
canvas {
  width: 120px;
  height: 200px;
  display: block;
}
</style>