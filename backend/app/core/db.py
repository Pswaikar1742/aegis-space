import logging
from typing import Generator, Any, List, Dict
import json
import uuid

from app.core.database import get_db, init_db

logger = logging.getLogger(__name__)

class MockResponse:
    def __init__(self, data: Any):
        self.data = data

class TableBuilder:
    def __init__(self, conn, table_name: str):
        self.conn = conn
        self.table_name = table_name
        self.action = None
        self._select_cols = "*"
        self._insert_data = None
        self._update_data = None
        self._delete = False
        self._where = []
        self._where_args = []
        self._order_by = None
        self._limit = None
        self._single = False
    
    def select(self, columns: str = "*"):
        self.action = "SELECT"
        self._select_cols = columns
        return self
        
    def insert(self, data: Dict | List[Dict]):
        self.action = "INSERT"
        self._insert_data = data
        return self
        
    def update(self, data: Dict):
        self.action = "UPDATE"
        self._update_data = data
        return self

    def delete(self):
        self.action = "DELETE"
        self._delete = True
        return self
        
    def eq(self, column: str, value: Any):
        # Handle Python booleans → SQLite integer
        if isinstance(value, bool):
            value = 1 if value else 0
        self._where.append(f"{column} = ?")
        self._where_args.append(value)
        return self

    def neq(self, column: str, value: Any):
        if isinstance(value, bool):
            value = 1 if value else 0
        self._where.append(f"{column} != ?")
        self._where_args.append(value)
        return self
        
    def in_(self, column: str, values: List[Any]):
        if not values:
            self._where.append("1 = 0")
            return self
        placeholders = ",".join(["?"] * len(values))
        self._where.append(f"{column} IN ({placeholders})")
        self._where_args.extend(values)
        return self

    def gte(self, column: str, value: Any):
        """Greater than or equal to."""
        self._where.append(f"{column} >= ?")
        self._where_args.append(value)
        return self

    def lte(self, column: str, value: Any):
        """Less than or equal to."""
        self._where.append(f"{column} <= ?")
        self._where_args.append(value)
        return self

    def gt(self, column: str, value: Any):
        self._where.append(f"{column} > ?")
        self._where_args.append(value)
        return self

    def lt(self, column: str, value: Any):
        self._where.append(f"{column} < ?")
        self._where_args.append(value)
        return self

    def like(self, column: str, pattern: str):
        self._where.append(f"{column} LIKE ?")
        self._where_args.append(pattern)
        return self
        
    def order(self, column: str, desc: bool = False):
        direction = "DESC" if desc else "ASC"
        self._order_by = f"{column} {direction}"
        return self
        
    def limit(self, count: int):
        self._limit = count
        return self
        
    def single(self):
        self._single = True
        return self

    def _build_where(self) -> str:
        if self._where:
            return " WHERE " + " AND ".join(self._where)
        return ""
        
    def execute(self):
        cur = self.conn.cursor()
        if self.action == "SELECT":
            query = f"SELECT {self._select_cols} FROM {self.table_name}"
            query += self._build_where()
            if self._order_by:
                query += f" ORDER BY {self._order_by}"
            if self._limit:
                query += f" LIMIT {self._limit}"
            
            cur.execute(query, self._where_args)
            rows = cur.fetchall()
            
            # Parse JSON strings back into dicts for payload columns
            parsed_rows = []
            for row in rows:
                parsed = dict(row)
                for key in parsed:
                    if key == "payload" and isinstance(parsed[key], str):
                        try:
                            parsed[key] = json.loads(parsed[key])
                        except (json.JSONDecodeError, TypeError):
                            pass
                parsed_rows.append(parsed)

            if self._single:
                return MockResponse(parsed_rows[0] if parsed_rows else None)
            return MockResponse(parsed_rows)
            
        elif self.action == "INSERT":
            if isinstance(self._insert_data, dict):
                data_list = [self._insert_data]
            else:
                data_list = self._insert_data
                
            if not data_list:
                return MockResponse([])
                
            cols = list(data_list[0].keys())
            placeholders = ",".join(["?"] * len(cols))
            
            # Use JSON serialization for dict/list types just in case
            processed_list = []
            for item in data_list:
                row = []
                for col in cols:
                    val = item.get(col)
                    if isinstance(val, (dict, list)):
                        val = json.dumps(val)
                    row.append(val)
                processed_list.append(row)
                
            query = f"INSERT INTO {self.table_name} ({','.join(cols)}) VALUES ({placeholders})"
            
            results = []
            for row_data in processed_list:
                cur.execute(query, row_data)
                # Fetch the inserted row using rowid
                last_id = cur.lastrowid
                # Try to fetch the inserted row. Use rowid as fallback.
                fetch_query = f"SELECT * FROM {self.table_name} WHERE rowid = ?"
                cur.execute(fetch_query, [last_id])
                res = cur.fetchone()
                if res:
                    parsed = dict(res)
                    for key in parsed:
                        if key == "payload" and isinstance(parsed[key], str):
                            try:
                                parsed[key] = json.loads(parsed[key])
                            except (json.JSONDecodeError, TypeError):
                                pass
                    results.append(parsed)
            self.conn.commit()
            return MockResponse(results)
            
        elif self.action == "UPDATE":
            if not self._update_data:
                return MockResponse([])
                
            set_clauses = []
            set_args = []
            for k, v in self._update_data.items():
                set_clauses.append(f"{k} = ?")
                if isinstance(v, (dict, list)):
                    v = json.dumps(v)
                elif isinstance(v, bool):
                    v = 1 if v else 0
                set_args.append(v)
                
            query = f"UPDATE {self.table_name} SET {','.join(set_clauses)}"
            query += self._build_where()
            
            cur.execute(query, set_args + self._where_args)
            self.conn.commit()

            # Now fetch the updated rows
            fetch_query = f"SELECT * FROM {self.table_name}"
            fetch_query += self._build_where()
            cur.execute(fetch_query, self._where_args)
            rows = cur.fetchall()

            parsed_rows = []
            for row in rows:
                parsed = dict(row)
                for key in parsed:
                    if key == "payload" and isinstance(parsed[key], str):
                        try:
                            parsed[key] = json.loads(parsed[key])
                        except (json.JSONDecodeError, TypeError):
                            pass
                parsed_rows.append(parsed)
            
            if self._single:
                return MockResponse(parsed_rows[0] if parsed_rows else None)
            return MockResponse(parsed_rows)

        elif self.action == "DELETE":
            query = f"DELETE FROM {self.table_name}"
            query += self._build_where()
            cur.execute(query, self._where_args)
            self.conn.commit()
            return MockResponse([])
            
        raise ValueError("No action specified (SELECT, INSERT, UPDATE, DELETE)")

class SQLiteWrapper:
    def __init__(self, conn):
        self.conn = conn
        
    def table(self, name: str) -> TableBuilder:
        return TableBuilder(self.conn, name)

# Initialize schema and seed on startup
init_db()

def get_supabase_client() -> SQLiteWrapper:
    """Returns a SQLiteWrapper that mocks the Supabase client interface."""
    conn = get_db()
    return SQLiteWrapper(conn)
