import requests

response = requests.post("http://127.0.0.1:5000/ask", json={
    "question": "Explain photosynthesis in detail like a teacher teaching students."
})

print("Answer:", response.json()["answer"])