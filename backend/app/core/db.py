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
        
    def eq(self, column: str, value: Any):
        self._where.append(f"{column} = ?")
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
        
    def execute(self):
        cur = self.conn.cursor()
        if self.action == "SELECT":
            query = f"SELECT {self._select_cols} FROM {self.table_name}"
            if self._where:
                query += " WHERE " + " AND ".join(self._where)
            if self._order_by:
                query += f" ORDER BY {self._order_by}"
            if self._limit:
                query += f" LIMIT {self._limit}"
            
            cur.execute(query, self._where_args)
            rows = cur.fetchall()
            
            if self._single:
                return MockResponse(rows[0] if rows else None)
            return MockResponse(rows)
            
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
                
            query = f"INSERT INTO {self.table_name} ({','.join(cols)}) VALUES ({placeholders}) RETURNING *"
            
            results = []
            for row_data in processed_list:
                cur.execute(query, row_data)
                res = cur.fetchone()
                if res:
                    results.append(res)
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
                set_args.append(v)
                
            query = f"UPDATE {self.table_name} SET {','.join(set_clauses)}"
            if self._where:
                query += " WHERE " + " AND ".join(self._where)
            query += " RETURNING *"
            
            cur.execute(query, set_args + self._where_args)
            rows = cur.fetchall()
            self.conn.commit()
            
            if self._single:
                return MockResponse(rows[0] if rows else None)
            return MockResponse(rows)
            
        raise ValueError("No action specified (SELECT, INSERT, UPDATE)")

class SQLiteWrapper:
    def __init__(self, conn):
        self.conn = conn
        
    def table(self, name: str) -> TableBuilder:
        return TableBuilder(self.conn, name)

# Initialize schema and seed on startup
init_db()

def get_supabase_client() -> Generator[SQLiteWrapper, None, None]:
    """Yields a SQLiteWrapper that mocks the Supabase client interface."""
    conn = get_db()
    yield SQLiteWrapper(conn)

