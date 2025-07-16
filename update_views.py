#!/usr/bin/env python3
"""
Update blog post view counts from Plausible Analytics
This script fetches real view counts from your Plausible instance and updates the blog.js file.
Keep your API key secure - only run this script locally or in secure CI/CD environments.
"""

import json
import os
import re
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
PLAUSIBLE_API_BASE = "https://thanks.gusarich.com/api/v1"
SITE_ID = "gusarich.com"
API_TOKEN = os.getenv("PLAUSIBLE_API_TOKEN")

# Blog posts to track
BLOG_POSTS = [
    "fuzzing-with-llms",
    "measuring-llm-entropy"
]

def fetch_plausible_views(post_id):
    """Fetch view count for a specific blog post from Plausible"""
    if not API_TOKEN:
        print(f"Warning: No API token found. Using fallback for {post_id}")
        return None
    
    page_url = f"/blog/{post_id}/"
    
    try:
        response = requests.get(
            f"{PLAUSIBLE_API_BASE}/stats/breakdown",
            params={
                "site_id": SITE_ID,
                "period": "custom",
                "date": "2020-01-01,2030-12-31",  # Custom date range for all-time data
                "property": "event:page",
                "filters": f"event:page=={page_url}"
            },
            headers={
                "Authorization": f"Bearer {API_TOKEN}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            for result in data.get("results", []):
                if result.get("page") == page_url:
                    return result.get("visitors", 0)
            return 0
        else:
            print(f"Error fetching views for {post_id}: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.RequestException as e:
        print(f"Error fetching views for {post_id}: {e}")
        return None

def update_blog_js_views(view_counts):
    """Update the view counts in blog.js"""
    blog_js_path = Path(__file__).parent / "blog.js"
    
    if not blog_js_path.exists():
        print("Error: blog.js not found")
        return False
    
    with open(blog_js_path, 'r') as f:
        content = f.read()
    
    # Find the staticViews object and update it
    static_views_pattern = r'const staticViews = \{([^}]+)\};'
    
    # Build new static views object
    new_views = []
    for post_id, count in view_counts.items():
        new_views.append(f"        '{post_id}': {count}")
    
    new_static_views = f"const staticViews = {{\n{',\\n'.join(new_views)}\n    }};"
    
    # Replace the staticViews object
    updated_content = re.sub(static_views_pattern, new_static_views, content, flags=re.MULTILINE | re.DOTALL)
    
    if updated_content != content:
        with open(blog_js_path, 'w') as f:
            f.write(updated_content)
        print("✓ Updated blog.js with new view counts")
        return True
    else:
        print("No changes needed in blog.js")
        return False

def main():
    """Main function to fetch and update view counts"""
    print("Fetching view counts from Plausible...")
    
    view_counts = {}
    fallback_counts = {
        'fuzzing-with-llms': 239,
        'measuring-llm-entropy': 94
    }
    
    for post_id in BLOG_POSTS:
        views = fetch_plausible_views(post_id)
        if views is not None:
            view_counts[post_id] = views
            print(f"✓ {post_id}: {views} views")
        else:
            view_counts[post_id] = fallback_counts.get(post_id, 0)
            print(f"! {post_id}: Using fallback ({view_counts[post_id]} views)")
    
    # Update blog.js
    if update_blog_js_views(view_counts):
        print("\n✓ View counts updated successfully!")
    else:
        print("\n! No updates made to blog.js")

if __name__ == "__main__":
    main()