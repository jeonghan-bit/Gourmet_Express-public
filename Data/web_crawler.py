from bs4 import BeautifulSoup
import json
import re

# Load the HTML content from a file (update the filename if needed)
with open("html_context.txt", "r", encoding="utf-8") as file:
    html_content = file.read()

soup = BeautifulSoup(html_content, "html.parser")

menu_items = []

# Function to clean item name (removes digits & special characters, keeps spaces)
def clean_name(name):
    return re.sub(r"[^a-zA-Z\s]", "", name).strip()

# Iterate through menu categories
for category in soup.find_all("div", class_="sc-8992fe5b-1"):
    category_name = category.find("h2").text.strip()
    
    for item in category.find_all("div", class_="sc-fUnMCh"):
        item_name = clean_name(item.find("h3").text.strip())  # Clean name
        item_description = item.find("p").text.strip() if item.find("p") else ""
        item_price = item.find("h4").text.strip()

        # Handle non-numeric prices
        try:
            item_price = float(item_price.replace("$", ""))
        except ValueError:
            item_price = None  # Set to None if price is not a valid float

        menu_items.append({
            "category": category_name,
            "name": item_name,
            "description": item_description,
            "price": item_price  # Can be None if price is "See Item"
        })

# Save extracted data to a JSON file
with open("menu_data.txt", "w", encoding="utf-8") as output_file:
    json.dump(menu_items, output_file, indent=4)

print("Menu data has been saved to menu_data.txt")
