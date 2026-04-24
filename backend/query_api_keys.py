import os, asyncio, re
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def q():
    url = re.sub(r'^postgresql://', 'postgresql+asyncpg://', os.environ['DATABASE_URL'])
    async with create_async_engine(url).connect() as c:
        r = await c.execute(text('SELECT user_id, provider, api_key FROM user_model_configs'))
        for row in r:
            print(f'user_id: {row[0]}  provider: {row[1]}  api_key: {row[2]}')

asyncio.run(q())
