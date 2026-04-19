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
        // Restore last selected user from localStorage
        const savedId = localStorage.getItem("currentUserId");
        const saved = res.data.find((u) => u._id === savedId);
        setCurrentUser(saved || res.data[0] || null);
        if (!savedId && res.data[0]) {
          localStorage.setItem("currentUserId", res.data[0]._id);
        }
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

  useEffect(() => {
    if (users.length > 0 && !currentUser) {
      setCurrentUser(users[0]);
    }
  }, [users]);

  return (
    <UserContext.Provider value={{ currentUser, users, switchUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
