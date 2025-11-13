import type { Item, AcoOptions, Solution, Bin } from '@/types'
import type { Ref } from 'vue'

/**
 * Реалізація Rank-Based Ant System (AS-Rank) для Bin Packing.
 * Цей клас оперує безпосередньо з `Ref` з Vue для феромонів,
 * що дозволяє Vue автоматично відстежувати зміни.
 */
export class AsRankAlgorithm {
  private options: AcoOptions
  private items: Item[]
  private binCapacity: number

  // Ми приймаємо Ref<number[][]> від Vue, щоб мутувати його напряму
  private pheromones: Ref<number[][]>
  private heuristics: number[][] = []

  private globalBestSolution: Solution | null = null
  private maxItemId = 0

  constructor(
    options: AcoOptions,
    items: Item[],
    binCapacity: number,
    pheromones: Ref<number[][]>, // Приймаємо 'ref' з App.vue
  ) {
    this.options = options
    this.items = items
    this.binCapacity = binCapacity
    this.pheromones = pheromones // Зберігаємо посилання
    this.maxItemId = Math.max(...items.map((i) => i.id)) + 1
  }

  /**
   * 1. Ініціалізація: розраховує евристику та початкові феромони
   */
  public initialize() {
    this.heuristics = Array(this.maxItemId)
      .fill(0)
      .map(() => Array(this.maxItemId).fill(0))

    // AS-Rank не потребує жадібного запуску.
    // Ми ініціалізуємо феромони базовим значенням tau_0.
    const tau_0 = 1.0 // Початковий феромон
    const newPheromones = Array(this.maxItemId)
      .fill(0)
      .map(() => Array(this.maxItemId).fill(tau_0))

    // Розрахунок евристики (η_ij = вага item_j)
    for (const item_i of this.items) {
      for (const item_j of this.items) {
        if (item_i.id !== item_j.id) {
          this.heuristics[item_i.id][item_j.id] = item_j.weight
        }
      }
    }

    // Оновлюємо 'ref' Vue, що запускає перемальовування
    this.pheromones.value = newPheromones
  }

  /**
   * 2. Виконання однієї повної ітерації (всі мурахи + оновлення)
   */
  public runIteration(): { global: Solution | null; iteration: Solution } {
    const antSolutions: Solution[] = []

    // 2a. Всі мурахи будують рішення
    for (let k = 0; k < this.options.numAnts; k++) {
      const order = this._constructSolution()
      const solution = this._evaluate(order)
      antSolutions.push(solution)
    }

    // 2b. Знаходимо найкращу мураху *цієї ітерації*
    const iterationBestSolution = antSolutions.sort((a, b) => a.numBins - b.numBins)[0]

    // 2c. Оновлюємо *глобально* найкраще рішення (якщо треба)
    if (
      !this.globalBestSolution ||
      iterationBestSolution.numBins < this.globalBestSolution.numBins
    ) {
      this.globalBestSolution = iterationBestSolution
    }

    // 2d. Оновлюємо феромони (логіка AS-Rank)
    this._updatePheromones(antSolutions)

    return {
      global: this.globalBestSolution,
      iteration: iterationBestSolution,
    }
  }

  /**
   * 3. Оновлення феромонів (AS-Rank)
   */
  private _updatePheromones(antSolutions: Solution[]) {
    // 3a. Випаровування на *всіх* шляхах
    const p = this.pheromones.value
    for (let i = 0; i < p.length; i++) {
      if (!p[i]) continue
      for (let j = 0; j < p[i].length; j++) {
        if (i === j || !p[i][j]) continue
        p[i][j] *= 1.0 - this.options.rho
      }
    }

    // 3b. Відкладення феромону (логіка AS-Rank)
    // Сортуємо мурах: від найкращої (найменше бінів) до найгіршої
    antSolutions.sort((a, b) => a.numBins - b.numBins)

    // Визначаємо 'W' найкращих мурах
    const W = Math.min(this.options.rankWeight, this.options.numAnts)

    // W найкращих мурах додають феромон
    for (let rank = 0; rank < W; rank++) {
      const antSolution = antSolutions[rank]
      const depositAmount = (W - rank) * (1.0 / antSolution.numBins)

      const order = antSolution.order
      for (let k = 0; k < order.length - 1; k++) {
        const id_i = order[k].id
        const id_j = order[k + 1].id
        if (p[id_i] && p[id_i][id_j] !== undefined) {
          p[id_i][id_j] += depositAmount
        }
      }
    }
  }

  /**
   * 4. Побудова шляху однією мурахою
   */
  private _constructSolution(): Item[] {
    const order: Item[] = []
    const unvisited = new Set(this.items.map((item) => item.id))
    const unvisitedArray = Array.from(unvisited)

    // Починаємо з випадкового предмета
    let currentItemId = unvisitedArray[Math.floor(Math.random() * unvisitedArray.length)]
    const currentItem = this.items.find((i) => i.id === currentItemId)!

    order.push(currentItem)
    unvisited.delete(currentItemId)

    while (unvisited.size > 0) {
      let totalProbability = 0
      const probabilities: { id: number; prob: number }[] = []

      for (const nextItemId of unvisited) {
        if (!this.pheromones.value[currentItemId] || !this.heuristics[currentItemId]) continue

        const tau = Math.pow(this.pheromones.value[currentItemId][nextItemId], this.options.alpha)
        const eta = Math.pow(this.heuristics[currentItemId][nextItemId], this.options.beta)
        const prob = tau * eta

        if (isFinite(prob)) {
          probabilities.push({ id: nextItemId, prob: prob })
          totalProbability += prob
        }
      }

      // Обираємо наступний предмет
      let nextItemId: number
      if (totalProbability === 0 || probabilities.length === 0) {
        nextItemId = Array.from(unvisited)[0] // Аварійний вибір
      } else {
        const r = Math.random() * totalProbability
        let cumulativeProb = 0
        for (const p of probabilities) {
          cumulativeProb += p.prob
          if (r <= cumulativeProb) {
            nextItemId = p.id
            break
          }
        }
        nextItemId = nextItemId! || probabilities[probabilities.length - 1].id // Failsafe
      }

      const nextItem = this.items.find((i) => i.id === nextItemId)!
      order.push(nextItem)
      unvisited.delete(nextItemId)
      currentItemId = nextItemId
    }
    return order
  }

  /**
   * 5. Оцінка рішення (First-Fit)
   */
  private _evaluate(order: Item[]): Solution {
    const bins: Bin[] = []
    let binCounter = 0

    for (const item of order) {
      if (!item) continue
      let placed = false

      // Спробувати покласти у існуючий бін
      for (const bin of bins) {
        if (bin.currentLoad + item.weight <= this.binCapacity) {
          bin.items.push(item)
          bin.currentLoad += item.weight
          placed = true
          break
        }
      }

      // Якщо не влізло, створити новий
      if (!placed) {
        bins.push({
          id: binCounter++,
          items: [item],
          currentLoad: item.weight,
        })
      }
    }
    return { order, bins, numBins: bins.length }
  }
}
