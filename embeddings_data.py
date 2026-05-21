import random
import math

CATEGORIES = {
    "Science": [
        "Physics", "Chemistry", "Biology", "Astronomy", "Quantum Mechanics", 
        "Evolution", "DNA", "Black Hole", "Relativity", "Neuroscience",
        "Periodic Table", "Thermodynamics", "Genetics", "Ecology", "Geology"
    ],
    "History": [
        "Ancient Rome", "World War II", "Renaissance", "French Revolution", 
        "Industrial Revolution", "Cold War", "Middle Ages", "Vikings", 
        "Samurai", "Mayan Civilization", "Napoleon", "Cleopatra", "Ottoman Empire"
    ],
    "Pop Culture": [
        "Star Wars", "The Beatles", "Marvel Comics", "Minecraft", "Pokemon", 
        "Hollywood", "Super Mario", "Harry Potter", "Jazz", "Hip Hop",
        "Netflix", "Game of Thrones", "Anime", "Rock Music"
    ],
    "Geography": [
        "Mount Everest", "Amazon River", "Sahara Desert", "Pacific Ocean", 
        "Alps", "Antarctica", "Greenland", "Grand Canyon", "Himalayas",
        "Nile", "Great Barrier Reef", "Iceland", "Madagascar"
    ],
    "Technology": [
        "Artificial Intelligence", "Blockchain", "Internet", "Smartphone", 
        "Cryptography", "Robotics", "Virtual Reality", "Nanotechnology",
        "Programming", "Linux", "Silicon Valley", "SpaceX"
    ]
}

def generate_embeddings():
    data = []
    
    # Generate points around cluster centers
    for i, (category, articles) in enumerate(CATEGORIES.items()):
        # Cluster center for 3D
        cx = math.cos(i * 2 * math.pi / len(CATEGORIES)) * 5
        cy = math.sin(i * 2 * math.pi / len(CATEGORIES)) * 5
        cz = random.uniform(-2, 2)
        
        # Cluster center for 2D
        cx2 = math.cos(i * 2 * math.pi / len(CATEGORIES)) * 10
        cy2 = math.sin(i * 2 * math.pi / len(CATEGORIES)) * 10
        
        for article in articles:
            # 3D coordinates with some noise
            x = cx + random.gauss(0, 1.2)
            y = cy + random.gauss(0, 1.2)
            z = cz + random.gauss(0, 1.2)
            
            # 2D coordinates with some noise
            x2 = cx2 + random.gauss(0, 2.5)
            y2 = cy2 + random.gauss(0, 2.5)
            
            data.append({
                "word": article,
                "category": category,
                "x2d": x2,
                "y2d": y2,
                "x3d": x,
                "y3d": y,
                "z3d": z
            })
            
    return data
