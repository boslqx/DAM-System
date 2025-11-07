from PIL import Image, ImageOps
import imagehash
import numpy as np
from sklearn.cluster import KMeans
import io  

#Calculate perceptual hashing, EXIF rotation, & resizing
def calculate_image_hash(image_file):

    try:
        print(f"[calculate_image_hash] Processing image file: {type(image_file)}")
        
        #Handle both UploadedFile and file path
        if hasattr(image_file, 'read'):
            print("[calculate_image_hash] Handling file upload")
            image_file.seek(0)
            file_content = image_file.read()
            print(f"[calculate_image_hash] File size: {len(file_content)} bytes")
            img = Image.open(io.BytesIO(file_content))
        else:
            print(f"[calculate_image_hash] Handling file path: {image_file}")
            img = Image.open(image_file)

        #Fix orientation based on EXIF
        img = ImageOps.exif_transpose(img)

        #Convert to RGB and resize
        img = img.convert('RGB')
        img = img.resize((256, 256))
        
        print("[calculate_image_hash] Image processed successfully")

        return {
            'average_hash': str(imagehash.average_hash(img)),
            'perceptual_hash': str(imagehash.phash(img)),
            'difference_hash': str(imagehash.dhash(img)),
        }
    except Exception as e:
        print(f"[calculate_image_hash] Error: {e}")
        import traceback
        traceback.print_exc()
        return None


#Dominant colors
def get_dominant_colors(image_file, num_colors=5):

    try:
        img = Image.open(image_file)
        img = img.convert('RGB')
        img = img.resize((150, 150))
        img_array = np.array(img)
        pixels = img_array.reshape(-1, 3)
        kmeans = KMeans(n_clusters=num_colors, random_state=42)
        kmeans.fit(pixels)
        colors = kmeans.cluster_centers_.astype(int)
        return [tuple(color) for color in colors]
    except Exception as e:
        print(f"[get_dominant_colors] Error: {e}")
        return []


#Comparing similarity
def compare_image_sets(hash_set1, hash_set2):

    try:
        scores = []
        for key in ['average_hash', 'perceptual_hash', 'difference_hash']:
            if key in hash_set1 and key in hash_set2:
                h1 = imagehash.hex_to_hash(hash_set1[key])
                h2 = imagehash.hex_to_hash(hash_set2[key])
                distance = h1 - h2
                similarity = max(0, 100 - (distance * 100 / 64))
                scores.append(similarity)
        return sum(scores) / len(scores) if scores else 0
    except Exception as e:
        print(f"[compare_image_sets] Error: {e}")
        return 0
    

