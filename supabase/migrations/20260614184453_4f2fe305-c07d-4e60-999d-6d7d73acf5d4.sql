
-- Break RLS recursion between orders and order_items by routing cross-table
-- visibility checks through SECURITY DEFINER helpers.

CREATE OR REPLACE FUNCTION public.user_owns_order_item(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN sellers s ON s.id = oi.seller_id
    WHERE oi.order_id = _order_id AND s.owner_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_is_order_buyer(_user_id uuid, _order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM orders WHERE id = _order_id AND buyer_id = _user_id)
$$;

-- orders: rebuild seller read + update without referencing order_items directly
DROP POLICY IF EXISTS "orders seller read" ON public.orders;
CREATE POLICY "orders seller read" ON public.orders
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM sellers s WHERE s.id = orders.seller_id AND s.owner_id = auth.uid())
  OR public.user_owns_order_item(auth.uid(), orders.id)
);

DROP POLICY IF EXISTS "orders seller update fulfillment" ON public.orders;
CREATE POLICY "orders seller update fulfillment" ON public.orders
FOR UPDATE TO authenticated
USING (public.user_owns_order_item(auth.uid(), orders.id))
WITH CHECK (public.user_owns_order_item(auth.uid(), orders.id));

-- order_items: replace cross-table policy with definer-function-based one
DROP POLICY IF EXISTS "order_items_visible" ON public.order_items;
CREATE POLICY "order_items_visible" ON public.order_items
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.user_is_order_buyer(auth.uid(), order_items.order_id)
  OR EXISTS (SELECT 1 FROM sellers s WHERE s.id = order_items.seller_id AND s.owner_id = auth.uid())
);
