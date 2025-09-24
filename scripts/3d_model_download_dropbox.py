import requests

def download_glb():
    url = "https://www.dropbox.com/scl/fi/ggtrj83j54hrx1v7n2lbo/3d-vh-m-united.glb?rlkey=m1yc2fks8t3ztqmf8y9bns47x&st=ge8biz5o&dl=1"  # your dropbox direct download link
    local_path = "/home/paulsavluc2/doctorsonline.shop/static/assets/3d/3d-vh-m-united.glb"  # save path with filename

    print("Downloading model from Dropbox...")
    response = requests.get(url)
    if response.status_code == 200:
        with open(local_path, "wb") as f:
            f.write(response.content)
        print("Model downloaded successfully!")
    else:
        print("Download failed with status code:", response.status_code)

if __name__ == "__main__":
    download_glb()
