import { createContext, useContext, useEffect, useState } from "react";
import { getUsers } from "../services/user.service";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then((res) => {
        setUsers(res.data);

        const savedId = localStorage.getItem("currentUserId");
        const saved = res.data.find((u) => u._id === savedId);
        const userToSet = saved || res.data[0] || null;

        if (userToSet) {
          localStorage.setItem("currentUserId", userToSet._id);
        }

        setCurrentUser(userToSet);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const switchUser = (userId) => {
    const user = users.find((u) => u._id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem("currentUserId", userId);
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, users, switchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
