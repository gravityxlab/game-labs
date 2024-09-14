const os = require('os');
const logger = require('./logger');

class System {
  constructor() {
    this.cpuUsage;
    this.memoryUsage;
    this.metadata = {};

    this._init();
  }

  usage() {
    return {
      cpu: this.cpuUsage,
      memory: this.memoryUsage,
      ...this.metadata,
    }
  }

  _init() {
    setInterval(() => {
      const startMeasure = this._getCPUUsage();
      
      setTimeout(() => {
        const endMeasure = this._getCPUUsage();
        const cpuUsage = this._calculateCPUPercentage(startMeasure, endMeasure);
        const memoryUsage = this._getMemoryUsage();

        this.cpuUsage = Number(cpuUsage.toFixed(2));
        this.memoryUsage = Number(memoryUsage.toFixed(2));
        logger.system.info(this.usage());
      }, 1000);
    }, 5000);
  }

  _getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
  
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    
    return { idle, total };
  }

  _calculateCPUPercentage(start, end) {
    const idleDiff = end.idle - start.idle;
    const totalDiff = end.total - start.total;
    return 100 - (100 * idleDiff / totalDiff);
  }

  _getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return ((totalMem - freeMem) / totalMem) * 100;
  }

}

module.exports = new System();