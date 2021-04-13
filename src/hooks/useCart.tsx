import { createContext, ReactNode, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

export interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviusValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviusValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviusValue]);

  const addProduct = async (productId: number) => {
    try {
      const products = [...cart];
      const findProduct = cart.find(product => product.id === productId);
      
      const stock = await api.get(`/stock/${productId}`);
      const currentAmount = findProduct ? findProduct.amount : 0;
      const amount = currentAmount + 1;

      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }
      
      if (findProduct) {
        findProduct.amount = amount;
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }

        products.push(newProduct);
      }

      setCart(products);
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const products = [...cart];
      const findProductIndex = cart.findIndex(product => product.id === productId);

      if (findProductIndex >= 0) {
        products.splice(findProductIndex, 1);
        setCart(products);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {   
      if (amount <= 0) {
        return; 
      }

      const stock = await api.get(`/stock/${productId}`);

      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        
        return;
      }

      const products = [...cart];
      const findProduct = products.find(product => product.id ===  productId);
      
      if (findProduct) {
        findProduct.amount = amount;
        setCart(products);
      } else {
        throw Error();
      }
     
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
