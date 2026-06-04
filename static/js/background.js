class GlobalBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'global-bg-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.inset = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '-1'; 
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.nodes = [];
        this.nodeCount = 50; // Fewer nodes for a cleaner sketchbook look
        this.maxDistance = 200;
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
                vx: (Math.random() - 0.5) * 0.3, // Slower, wandering movement
                vy: (Math.random() - 0.5) * 0.3,
                radius: Math.random() * 1.5 + 0.5
            });
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    handleMouseMove(e) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.nodes.forEach((node, i) => {
            // Move
            node.x += node.vx;
            node.y += node.vy;
            
            // Wrap around screen
            if (node.x < 0) node.x = this.canvas.width;
            if (node.x > this.canvas.width) node.x = 0;
            if (node.y < 0) node.y = this.canvas.height;
            if (node.y > this.canvas.height) node.y = 0;
            
            // Draw node as pencil dot
            this.ctx.fillStyle = 'rgba(44, 62, 80, 0.4)'; // Graphite grey
            this.ctx.beginPath();
            this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw lines (sketchy pencil lines)
            for (let j = i + 1; j < this.nodes.length; j++) {
                const other = this.nodes[j];
                const dx = node.x - other.x;
                const dy = node.y - other.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < this.maxDistance) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(other.x, other.y);
                    const alpha = (1 - dist / this.maxDistance) * 0.15; // Very subtle lines
                    this.ctx.strokeStyle = `rgba(44, 62, 80, ${alpha})`;
                    this.ctx.lineWidth = 0.5; 
                    this.ctx.stroke();
                }
            }
            
            // Mouse interaction
            if (this.mouse.x !== null) {
                const mdx = node.x - this.mouse.x;
                const mdy = node.y - this.mouse.y;
                const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
                if (mdist < 150) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(node.x, node.y);
                    this.ctx.lineTo(this.mouse.x, this.mouse.y);
                    const malpha = (1 - mdist / 150) * 0.2; 
                    this.ctx.strokeStyle = `rgba(41, 128, 185, ${malpha})`; // Blue pen hint
                    this.ctx.lineWidth = 0.8;
                    this.ctx.stroke();
                }
            }
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GlobalBackground();
});
