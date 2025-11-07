import { useCallback, useEffect, useRef, useState } from 'react';

import type { Quiz } from '@/types/quiz';

import useToast from '@/hooks/useToast';

import { quizService } from '@/services';

export function useFetchQuiz(collectionId?: number, isReview?: boolean, isRefetchQuiz?: boolean) {
    const [quizList, setQuizList] = useState<Quiz[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const { showErrorToast } = useToast();

    const quizListLength = useRef<number>(0);
    const fetchQuiz = async () => {
        if (!collectionId) return;

        try {
            const res = await quizService.getRandomQuizOfCollection(collectionId, isReview);
            setQuizList(res?.length ? res : []);
            quizListLength.current = res?.length ? res.length : 0;
            setCurrentIndex(0);
        } catch (err) {
            showErrorToast(err);
        }
    };

    useEffect(() => {
        fetchQuiz();
    }, [collectionId, isReview]);

    useEffect(() => {
        if (!isRefetchQuiz) return;
        fetchQuiz();
    }, [isRefetchQuiz]);

    const handleSkip = useCallback(() => {
        setCurrentIndex((prevIndex) => {
            if (prevIndex + 1 < quizListLength.current) {
                return prevIndex + 1;
            } else {
                fetchQuiz(); // fetch mới khi hết quiz
                return 0;
            }
        });
    }, [quizListLength, collectionId]);

    return { quizList, currentIndex, fetchQuiz, handleSkip, setCurrentIndex };
}
