import { useState } from "react";
import { Alert, Button, ScrollView, StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export default function VoiceApp() {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [summary, setSummary] = useState("");

  const questions = [
    "簡単な自己紹介をお願いします.",
    "あなたの強みを教えてください.",
    "あなたの弱みを教えてください.",
    "今までで最も成果を出せたと考えることを教えてください.",
  ];

  useSpeechRecognitionEvent("start", () => setRecognizing(true));
  useSpeechRecognitionEvent("end", () => setRecognizing(false));
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript);
  });
  useSpeechRecognitionEvent("error", (event) => {
    console.log("error code:", event.error, "error message:", event.message);
  });

  const handleStartRecognition = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      console.warn("Permissions not granted", result);
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: "ja-JP",
      interimResults: true,
    });
  };

  const handleNextQuestion = () => {
    if (!transcript.trim()) {
      Alert.alert("Error", "Please record your answer first!");
      return;
    }
    // Save the response
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = transcript;
    setResponses(updatedResponses);
    setTranscript("");

    // Move to the next question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      Alert.alert("Finished", "You have completed all the questions.");
    }
  };

  const handleSummarize = async () => {
    if (responses.length < 1) {
      Alert.alert("Error, Please record and transcribe first!");
      return;
    }
    const GEMINI_ENDPOINT =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=";
    const GEMINI_APIKEY = "<YOUR_API_KEY>";

    let inputText = "";
    responses.forEach((answer, index) => {
      inputText = `${inputText}\n\n問${index + 1}: ${
        questions[index]
      }\n回答: ${answer}`;
    });

    const resp = await fetch(GEMINI_ENDPOINT + GEMINI_APIKEY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        "contents": [{
          "parts": [{
            "text":
              `次の文章は面接の質問と回答のまとめです。それぞれの質問に対する、回答の要点をまとめて、箇条書きにして整理してください。文章:\n\n${inputText}`,
          }],
        }],
      }),
    });
    console.log("request completed");
    if (!resp.ok) {
      const errText = "Error occured while generating summary.";
      console.log(errText);
      Alert.alert("Error: Failed to summarize text. Please try again.");
      return;
    }
    const data = await resp.json();
    console.log(data.candidates[0].content.parts[0].text);
    setSummary(data.candidates[0].content.parts[0].text);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
    >
      <View style={styles.container}>
        <ThemedText style={styles.question}>
          {questions[currentQuestionIndex]}
        </ThemedText>

        {!recognizing
          ? <Button title="Start Recording" onPress={handleStartRecognition} />
          : (
            <Button
              title="Stop Recording"
              onPress={() => ExpoSpeechRecognitionModule.stop()}
            />
          )}

        <ScrollView>
          <ThemedText>Transcription:</ThemedText>
          <ThemedText>{transcript}</ThemedText>
        </ScrollView>

        {!recognizing && (
          <Button title="Next Question" onPress={handleNextQuestion} />
        )}

        <ScrollView>
          <ThemedText>Responses:</ThemedText>
          {responses.map((response, index) => (
            <ThemedText key={`question-${index}`}>
              Q{index + 1}: {response}
            </ThemedText>
          ))}
        </ScrollView>
      </View>

      {!recognizing
        ? <Button title="Generate summary" onPress={handleSummarize} />
        : <ThemedText>Recording ...</ThemedText>}

      <ScrollView>
        <ThemedText>Summary:</ThemedText>
        <ThemedText>{summary}</ThemedText>
      </ScrollView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    padding: 16,
  },
  question: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
});
