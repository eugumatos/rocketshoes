import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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

  const addProduct = async (productId: number) => {
    try {
      const stock = await api.get(`/stock/${productId}`);
      const product = await api.get(`/products/${productId}`);
      const findProduct = cart.find(product => product.id === productId);

      if (!findProduct) {
        setCart([...cart, {...product.data, amount: 1}]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product.data, amount: 1}]));

        return;
      }

      const products = [...cart];
      const findProductIndex = products.findIndex(item => item.id === productId);
      
      if (stock.data.amount <= products[findProductIndex].amount) {
        toast.error('Quantidade solicitada fora de estoque');

        return;
      }

      products[findProductIndex].amount+=1;

      setCart(products);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const filteredProduct = cart.filter(product => product.id !== productId);

      if (filteredProduct.length > 0) {
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(filteredProduct));
      } else {
        localStorage.removeItem('@RocketShoes:cart');

        return;
      }

      setCart(filteredProduct);
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
      const findProductIndex = products.findIndex(item => item.id === productId);
      
      products[findProductIndex].amount = amount;

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      
      setCart(products);
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
