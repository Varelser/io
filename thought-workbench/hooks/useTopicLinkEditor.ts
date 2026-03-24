import { useState } from "react";
import { RELATIONS } from "../constants/relations";

export function useTopicLinkEditor() {
  const [newTopicLinkTarget, setNewTopicLinkTarget] = useState("");
  const [newTopicLinkRelation, setNewTopicLinkRelation] = useState<string>(RELATIONS[0]);
  const [newTopicLinkMeaning, setNewTopicLinkMeaning] = useState("");

  const resetTopicLinkForm = () => {
    setNewTopicLinkTarget("");
    setNewTopicLinkMeaning("");
  };

  return {
    newTopicLinkTarget, setNewTopicLinkTarget,
    newTopicLinkRelation, setNewTopicLinkRelation,
    newTopicLinkMeaning, setNewTopicLinkMeaning,
    resetTopicLinkForm,
  };
}
