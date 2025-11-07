import React from 'react';

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRouter } from 'expo-router';

import { register } from '@/store/action/learning-list-action';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';

import { useThemeColor } from '@/hooks/useThemeColor';
import useToast from '@/hooks/useToast';

import { collectionService } from '@/services';

import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import Button from './button';

const DEFAULT_GOAL = 20;

function FastRegister() {
    const { showErrorToast } = useToast();
    const { data: popularList = [] } = useQuery({
        queryKey: ['popular-list'],
        queryFn: collectionService.getAllCollection,
    });

    const queryClient = useQueryClient();

    const filterCollections = popularList.filter((item: any) => item.is_registered === false);
    const white = useThemeColor({}, 'white');
    const shadowColor = useThemeColor({}, 'shadowColor');
    const dispatch = useDispatch();

    const router = useRouter();

    const handlePressLearnNow = async (collectionId: number) => {
        try {
            const res = await collectionService.registerCollection(collectionId, DEFAULT_GOAL);
            if (res) {
                dispatch(
                    register({
                        ...res,
                        collection_id: res.collection_id,
                        collection: {
                            id: res.collection_id,
                            name: res.collection.name,
                            card_count: res.collection.card_count,
                            icon: res.collection.icon,
                        },
                        mastered_card_count: 0,
                        today_learned_count: 0,
                        learned_card_count: 0,
                        is_registered: true,
                    }),
                );
                router.replace(`/quiz/${collectionId}`);
                queryClient.invalidateQueries({ queryKey: ['popular-list'] });
            } else {
                throw new Error('Đăng ký bài học không thành công. Vui lòng thử lại.');
            }
        } catch (error) {
            showErrorToast(error);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container} style={{ flex: 1, width: '100%' }}>
            {filterCollections.map((item: any) => (
                <ThemedView key={item.id} style={[styles.card, { backgroundColor: white, shadowColor }]}>
                    <Text style={styles.icon}>{item.icon}</Text>
                    <View style={{ flex: 1, marginRight: 12 }}>
                        <ThemedText style={styles.name} numberOfLines={1}>
                            {item.name}
                        </ThemedText>
                        <ThemedText lighter style={styles.cardCount}>
                            {item.card_count} từ vựng
                        </ThemedText>
                    </View>

                    <Button buttonStyle={styles.button} onPress={() => handlePressLearnNow(item.id)}>
                        Học ngay
                    </Button>
                </ThemedView>
            ))}
        </ScrollView>
    );
}

export default FastRegister;

const styles = StyleSheet.create({
    container: {
        paddingBottom: 100,
        width: '100%',
        padding: 16,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
        marginHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 1,
        elevation: 2,
    },
    icon: {
        fontSize: 28,
        marginRight: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardCount: {
        fontSize: 14,
        marginTop: 2,
    },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    buttonText: {
        fontWeight: '600',
        fontSize: 14,
    },
});
