const conversationStates = new Map();

const getConversationState = (userId) => {
  return conversationStates.get(userId) || { state: 'initial' };
};

const setConversationState = (userId, state) => {
  conversationStates.set(userId, state);
};

module.exports = {
  conversationStates,
  getConversationState,
  setConversationState
};