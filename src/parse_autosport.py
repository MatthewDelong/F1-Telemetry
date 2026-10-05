import json
from html.parser import HTMLParser

class AutosportParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_table = False
        self.in_tbody = False
        self.in_tr = False
        self.in_td = False
        self.in_driver_td = False
        self.in_points_td = False
        
        self.current_cell_class = ""
        self.current_data = ""
        self.current_row = {}
        
        self.results = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "table" and "ms-table--standings" in attrs.get("class", ""):
            self.in_table = True
        elif self.in_table and tag == "tbody":
            self.in_tbody = True
        elif self.in_tbody and tag == "tr":
            self.in_tr = True
            self.current_row = {}
        elif self.in_tr and tag == "td":
            self.in_td = True
            cls = attrs.get("class", "")
            if "ms-table_field--driver" in cls or "ms-table_field--team" in cls:
                self.in_driver_td = True
            elif "ms-table_field--points" in cls:
                self.in_points_td = True
            self.current_data = ""

    def handle_data(self, data):
        if self.in_driver_td or self.in_points_td:
            self.current_data += data

    def handle_endtag(self, tag):
        if self.in_table and tag == "table":
            self.in_table = False
        elif self.in_tbody and tag == "tbody":
            self.in_tbody = False
        elif self.in_tr and tag == "tr":
            self.in_tr = False
            if "name" in self.current_row and "points" in self.current_row:
                self.results.append(self.current_row)
        elif self.in_td and tag == "td":
            self.in_td = False
            val = self.current_data.strip().replace("\n", "").replace("  ", " ")
            if self.in_driver_td:
                # Driver names sometimes have \n. Remove duplicate spaces.
                import re
                val = re.sub(r'\s+', ' ', val)
                
                parts = val.split(" ")
                if len(parts) > 1:
                    name = parts[0][0] + ". " + " ".join(parts[1:])
                else:
                    name = val
                self.current_row["name"] = name
                self.in_driver_td = False
            elif self.in_points_td:
                try:
                    self.current_row["points"] = int(val)
                except ValueError:
                    self.current_row["points"] = 0
                self.in_points_td = False

def parse_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    parser = AutosportParser()
    parser.feed(content)
    return parser.results

import sys
res = parse_file(sys.argv[1])
print(json.dumps(res, indent=2))
