import React, { useEffect, useState } from 'react';

import { FlatList, Platform, StyleSheet, View } from 'react-native';

import { RootState } from '@/store/reducers';
import { CollectionProgress } from '@/store/reducers/learning-list-reducer';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

import CategoryList from '@/components/category-list';
import HorizontalList from '@/components/horizontal-list';
import ListHeader from '@/components/list-header';
import ScreenWrapper from '@/components/screen-wrapper';

import { collectionService } from '@/services';

function List() {
    const collections = useSelector((state: RootState) => state.learningList.collections);

    const [progressList, setProgressList] = useState<CollectionProgress[]>([]);
    const [searchText, setSearchText] = useState('');
    useEffect(() => {
        setProgressList(collections.filter((item: CollectionProgress) => item.status === 'in_progress'));
    }, [collections]);

    const { data: allList = [] } = useQuery({
        queryKey: ['popular-list'],
        queryFn: collectionService.getAllCollection,
    });

    const filteredAll = allList.filter((item: any) => item.name.toLowerCase().includes(searchText.toLowerCase()));

    return (
        <ScreenWrapper>
            <SafeAreaView style={[styles.wrapper]}>
                <ListHeader onSearchChange={setSearchText} />

                {searchText ? (
                    <View style={{ paddingHorizontal: 24 }}>
                        <HorizontalList list={filteredAll} isVertical={true} headerName="Kết quả" />
                    </View>
                ) : (
                    <FlatList
                        data={['popular', 'learningList', 'category']}
                        keyExtractor={(_, idx) => idx.toString()}
                        renderItem={({ item }) => {
                            if (item === 'learningList' && progressList?.length)
                                return (
                                    <HorizontalList
                                        headerName="Đang học"
                                        containerStyle={{ marginTop: 24 }}
                                        list={progressList}
                                        isLearningList={true}
                                    />
                                );
                            if (item === 'popular')
                                return <HorizontalList isRandomColor list={allList} headerName="Phổ biến" />;
                            if (item === 'category') return <CategoryList headerName="Danh mục" />;
                            return <></>;
                        }}
                        contentContainerStyle={{
                            paddingVertical: 16,
                            paddingBottom: Platform.OS === 'ios' ? 140 : 80,
                            paddingHorizontal: 24,
                        }}
                    />
                )}
            </SafeAreaView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
});

export default List;
