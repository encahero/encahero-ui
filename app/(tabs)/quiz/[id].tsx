import { useCallback, useEffect, useMemo, useState } from 'react';

import { useLocalSearchParams } from 'expo-router';

import checkNewDay from '@/helper/check-new-day';
import { answerCard, changeStatus, increaseMasteredCount } from '@/store/action/learning-list-action';
import { RootState } from '@/store/reducers';
import { CollectionProgress } from '@/store/reducers/learning-list-reducer';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

import CongratsModal from '@/components/congratulation-modal';
import LearningList from '@/components/learning-list';
import ModalBottomSheet from '@/components/modal-bottom-sheet';
import QuizSetting from '@/components/quiz-setting';
import NoCollection from '@/components/quiz-ui/no-collection';
import NoQuiz from '@/components/quiz-ui/no-quiz';
import QuizAction from '@/components/quiz-ui/quiz-action';
import QuizHeader from '@/components/quiz-ui/quiz-header';
import QuizProgress from '@/components/quiz-ui/quiz-progress';
import RandomQuiz, { QuestionType } from '@/components/random-quiz';
import ScreenWrapper from '@/components/screen-wrapper';

import { useBottomSheet } from '@/hooks/useBottomSheet';
import { useFetchQuiz } from '@/hooks/useFetchQuiz';
import { useThemeColor } from '@/hooks/useThemeColor';
import useToast from '@/hooks/useToast';

import { collectionService, quizService } from '@/services';

function QuizScreen() {
    const { ref: leftRef, open: openList, close: closeList } = useBottomSheet();
    const { ref: rightRef, open: openSetting, close: closeSetting } = useBottomSheet();

    const dispatch = useDispatch();

    const collections = useSelector((state: RootState) => state.learningList.collections);
    const { id } = useLocalSearchParams();
    const { showErrorToast } = useToast();

    const [isReviewMode, setIsReviewMode] = useState(false);
    const [showCongratsModal, setShowCongratsModal] = useState(false);
    const [isRefetchQuiz, setIsRefetchQuiz] = useState(false);

    const queryClient = useQueryClient();

    // Determine current collection id
    const collectionId = useMemo(() => {
        if (!collections) return null;

        // Kiểm tra nếu có id trong URL
        if (id) {
            const current = collections.find((c: CollectionProgress) => c.collection_id === Number(id));
            if (current && current.status !== 'stopped') {
                return Number(id);
            }
        }

        const activeCollection = collections.find((c: CollectionProgress) => c.status === 'in_progress');
        return activeCollection?.collection_id;
    }, [id, collections]);

    const currentCollection: CollectionProgress = useMemo(() => {
        if (!collections?.length || !collectionId) return null;
        return collections.find((c: CollectionProgress) => c.collection_id === collectionId) ?? null;
    }, [collectionId, collections]);

    useEffect(() => {
        if (!currentCollection) return;
        setIsRefetchQuiz(currentCollection.today_learned_count === currentCollection.task_count);
    }, [currentCollection]);

    const { quizList, currentIndex, handleSkip } = useFetchQuiz(collectionId, isReviewMode, isRefetchQuiz);

    const toggleReviewMode = () => {
        setIsReviewMode(!isReviewMode);
    };

    const handleMasteredWord = useCallback(
        async (isNew: boolean) => {
            try {
                if (!collectionId) return;
                const res = await collectionService.changeStatusOfCard(
                    collectionId,
                    quizList[currentIndex].id,
                    'mastered',
                );

                if (res) {
                    // refetch if new day
                    const last_reviewed_at = res.collection.last_reviewed_at;
                    const isNewDay = await checkNewDay(currentCollection.last_reviewed_at, last_reviewed_at);

                    if (isNewDay) {
                        queryClient.invalidateQueries({ queryKey: ['my-collections'] });
                    }

                    queryClient.setQueryData(['userStatsDailyAndWeekly'], (old: any) => {
                        if (!old) return old;
                        return {
                            ...old,
                            today: (old.today ?? 0) + 1,
                            week: (old.week ?? 0) + 1,
                        };
                    });

                    queryClient.setQueryData(['contribution'], (old: any[] | undefined) => {
                        if (!old) return old;

                        const today = new Date().toISOString().split('T')[0];
                        let found = false;

                        const newData = old.map((item) => {
                            if (item.date === today) {
                                found = true;
                                return { ...item, count: (item.count || 0) + 1 };
                            }
                            return item;
                        });

                        if (!found) newData.push({ date: today, count: 1 });
                    });

                    dispatch(increaseMasteredCount({ collection: res.collection, isNew }));

                    if (res?.collectionCompleted) {
                        dispatch(changeStatus({ id: collectionId, status: 'completed' })); // router.replace('/');
                        setShowCongratsModal(true);
                        return;
                    }

                    handleSkip();
                }
            } catch (error) {
                showErrorToast(error);
            }
        },
        [collectionId, currentCollection, currentIndex, quizList, dispatch, queryClient, showErrorToast, handleSkip],
    );

    const handleSubmitAnswer = useCallback(
        async (quizType: QuestionType, cardId: number, isNew: boolean, rating?: 'E' | 'M' | 'H') => {
            try {
                if (!collectionId) return;
                const res = await quizService.answer(collectionId, cardId, quizType, rating, isNew);

                if (res && res.collection) {
                    dispatch(answerCard({ collection: res.collection, isNew }));
                    handleSkip();

                    const last_reviewed_at = res.collection.last_reviewed_at;
                    const isNewDay = await checkNewDay(currentCollection.last_reviewed_at, last_reviewed_at);

                    if (isNewDay) {
                        queryClient.invalidateQueries({ queryKey: ['my-collections'] });
                    }
                }
            } catch (error) {
                showErrorToast(error);
            }
        },
        [collectionId, currentCollection, dispatch, handleSkip, queryClient, showErrorToast],
    );

    const reviewBg = useThemeColor({}, 'reviewBg');

    if (!currentCollection) return <NoCollection />;

    return (
        <ScreenWrapper>
            <SafeAreaView style={[isReviewMode && { backgroundColor: reviewBg }, { paddingHorizontal: 20, flex: 1 }]}>
                <QuizHeader
                    collectionName={currentCollection?.collection?.name}
                    onOpenList={openList}
                    onOpenSetting={openSetting}
                />

                {quizList.length > 0 && (
                    <QuizProgress
                        learned={currentCollection?.today_learned_count ?? 0}
                        total={currentCollection?.task_count ?? 1}
                    />
                )}

                {quizList.length > 0 ? (
                    <RandomQuiz quiz={quizList[currentIndex]} onSubmit={handleSubmitAnswer} />
                ) : (
                    <NoQuiz />
                )}

                {quizList.length > 0 && (
                    <QuizAction
                        status={currentCollection?.status}
                        onMasterWord={handleMasteredWord}
                        isNewQuiz={quizList[currentIndex].isNew}
                        onSkip={handleSkip}
                        isShowMasteredButton={!(currentCollection?.status === 'completed')}
                    />
                )}

                <ModalBottomSheet bottomSheetModalRef={leftRef}>
                    <LearningList selectedIndex={currentCollection?.collection_id} close={closeList} />
                </ModalBottomSheet>

                <ModalBottomSheet bottomSheetModalRef={rightRef}>
                    <QuizSetting
                        collectionId={currentCollection?.collection_id}
                        onClose={closeSetting}
                        onToggle={toggleReviewMode}
                        reviewMode={isReviewMode}
                        isShowReviewMode={!(currentCollection?.status === 'completed')}
                        isShowStopButton={!(currentCollection?.status === 'completed')}
                    />
                </ModalBottomSheet>

                <CongratsModal visible={showCongratsModal} onClose={() => setShowCongratsModal(false)} />
            </SafeAreaView>
        </ScreenWrapper>
    );
}

export default QuizScreen;
