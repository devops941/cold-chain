"""Product routes."""

from __future__ import annotations

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..database import get_db
from ..deps import get_current_user, require_roles
from ..models.schemas import ProductIn, ProductOut
from ..utils import now_utc, serialize

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products(
    search: str | None = Query(None),
    category: str | None = Query(None),
    user: dict = Depends(get_current_user),
) -> list[ProductOut]:
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"sku": {"$regex": search, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    docs = await get_db().products.find(query).sort("name", 1).to_list(500)
    return [ProductOut(**serialize(d)) for d in docs]


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductIn,
    user: dict = Depends(require_roles("admin", "manager")),
) -> ProductOut:
    db = get_db()
    if await db.products.find_one({"sku": payload.sku}):
        raise HTTPException(status.HTTP_409_CONFLICT, "SKU already exists")
    if payload.min_c >= payload.max_c:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "min_c must be below max_c")
    doc = payload.model_dump()
    doc["created_at"] = now_utc()
    result = await db.products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ProductOut(**serialize(doc))


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductIn,
    user: dict = Depends(require_roles("admin", "manager")),
) -> ProductOut:
    db = get_db()
    try:
        oid = ObjectId(product_id)
    except InvalidId:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product id")
    doc = payload.model_dump()
    doc["updated_at"] = now_utc()
    updated = await db.products.find_one_and_update(
        {"_id": oid}, {"$set": doc}, return_document=True
    )
    if updated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return ProductOut(**serialize(updated))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    user: dict = Depends(require_roles("admin", "manager")),
) -> None:
    try:
        oid = ObjectId(product_id)
    except InvalidId:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid product id")
    result = await get_db().products.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
