class MeshAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.nodeCount = 40;
        this.maxDistance = 150;
        this.mouse = { x: null, y: null };
        
        this.init();
        this.animate();
        
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    }

    init() {
        this.resize();
        this.nodes = [];
        for (let i = 0; i < this.nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 1.5 + 0.5
            });
        }
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.offsetWidth;
        this.canvas.height = parent.offsetHeight;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.nodes.forEach((node, i) => {
            // Move
            node.x += node.vx;
            node.y += node.vy;
            
            // Bounce
            if (node.x < 0 || node.x > this.canvas.width) node.vx *= -1;
            if (node.y < 0 || node.y > this.canvas.height) node.vy *= -1;
            
            // Draw node
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
            this.ctx.fill();
            
            // Draw lines
            for (let j = i + 1; j < this.nodes.length; j++) {
                const other = this.nodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.maxDistance) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(other.x, other.y);
                    const alpha = (1 - dist / this.maxDistance) * 0.2;
                    this.ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            }
            
            // Mouse interaction
            if (this.mouse.x !== null) {
                const mdx = node.x - this.mouse.x;
                const mdy = node.y - this.mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 100) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    const malpha = (1 - mdist / 100) * 0.3;
                    this.ctx.strokeStyle = `rgba(0, 229, 255, ${malpha})`;
                    this.ctx.stroke();
                }
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MeshAnimation('hero-mesh-canvas');
});
