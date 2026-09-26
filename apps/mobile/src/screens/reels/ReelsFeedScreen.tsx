import React,{useCallback,useEffect,useMemo,useRef,useState}from'react';
import{ActivityIndicator,Dimensions,FlatList,Pressable,StyleSheet,View}from'react-native';
import Video from'react-native-video';
import{AppText,ErrorState,Screen}from'../../components/ui';
import{getWorkoApiErrorMessage}from'../../api/apiClient';
import{API_BASE_URL}from'../../config/api';
import{tokenStorage}from'../../auth/tokenStorage';
import{reelsApi}from'../../reels/reelsApi';
import type{ReelFeedItem}from'../../reels/types';
import{useTheme}from'../../theme/ThemeProvider';

const {height:WINDOW_HEIGHT}=Dimensions.get('window');
const FEED_HEIGHT=Math.max(WINDOW_HEIGHT-72,520);
const API_ORIGIN=API_BASE_URL.replace('/api/v1','');
const videoUrl=(path:string):string=>API_ORIGIN+path;

export const ReelsFeedScreen=():React.JSX.Element=>{
 const{theme}=useTheme();
 const[items,setItems]=useState<ReelFeedItem[]>([]),[nextCursor,setNextCursor]=useState<string|null>(null),[hasMore,setHasMore]=useState(false);
 const[loading,setLoading]=useState(true),[loadingMore,setLoadingMore]=useState(false),[refreshing,setRefreshing]=useState(false),[error,setError]=useState<string|null>(null),[activeId,setActiveId]=useState<string|null>(null),[authToken,setAuthToken]=useState<string|null>(null);
 const viewabilityConfig=useRef({itemVisiblePercentThreshold:70}).current;
 const onViewableItemsChanged=useRef(({viewableItems}:{viewableItems:Array<{item:any}>})=>setActiveId(viewableItems[0]?.item?.id??null)).current;

 const fetchPage=useCallback(async(reset:boolean,cursor?:string)=>{
  if(reset){setLoading(true);setError(null);}else setLoadingMore(true);
  try{
   const response=await reelsApi.getFeed(10,cursor);
   setItems(current=>reset?response.items:[...current,...response.items.filter(item=>!current.some(existing=>existing.id===item.id))]);
   setNextCursor(response.nextCursor);setHasMore(response.hasMore);
   if(reset)setActiveId(response.items[0]?.id??null);
  }catch(err){setError(getWorkoApiErrorMessage(err));}
  finally{if(reset)setLoading(false);else setLoadingMore(false);}
 },[]);

 const loadInitial=useCallback(()=>fetchPage(true),[fetchPage]);
 const loadMore=useCallback(()=>{if(hasMore&&!loadingMore&&nextCursor)void fetchPage(false,nextCursor);},[fetchPage,hasMore,loadingMore,nextCursor]);
 useEffect(()=>{setAuthToken(tokenStorage.getAccessToken());void loadInitial();},[loadInitial]);
 const refresh=useCallback(async()=>{setRefreshing(true);try{await fetchPage(true);}finally{setRefreshing(false);}},[fetchPage]);
 const toggleLike=useCallback(async(item:ReelFeedItem)=>{
  try{const result=item.liked?await reelsApi.unlike(item.id):await reelsApi.like(item.id);setItems(current=>current.map(reel=>reel.id===item.id?{...reel,liked:result.liked,likes:Math.max(0,reel.likes+(result.liked?1:-1))}:reel));}
  catch(err){setError(getWorkoApiErrorMessage(err));}
 },[]);
 const footer=useMemo(()=>loadingMore?<View style={styles.footer}><ActivityIndicator color={theme.colors.accent}/></View>:undefined,[loadingMore,theme.colors.accent]);

 if(loading)return<Screen><View style={styles.center}><ActivityIndicator color={theme.colors.accent}/><AppText variant="body" muted style={styles.loadingText}>Loading reels...</AppText></View></Screen>;
 if(error&&items.length===0)return<Screen><ErrorState title="Could not load reels" description={error} onActionPress={()=>void loadInitial()}/></Screen>;

 return <View style={[styles.root,{backgroundColor:theme.colors.background}]}>
  {error?<Pressable onPress={()=>setError(null)} style={[styles.errorBanner,{backgroundColor:theme.colors.surface,borderColor:theme.colors.border}]}><AppText variant="caption" style={{color:theme.colors.danger}}>{error} • Tap to dismiss</AppText></Pressable>:null}
  <FlatList data={items} keyExtractor={item=>item.id}
   renderItem={({item})=><ReelCard item={item} active={item.id===activeId} token={authToken} onLike={()=>void toggleLike(item)} theme={theme}/>}
   pagingEnabled showsVerticalScrollIndicator={false} snapToInterval={FEED_HEIGHT} decelerationRate="fast"
   getItemLayout={(_,index)=>({length:FEED_HEIGHT,offset:FEED_HEIGHT*index,index})}
   viewabilityConfig={viewabilityConfig} onViewableItemsChanged={onViewableItemsChanged}
   onEndReached={loadMore} onEndReachedThreshold={0.6}
   refreshing={refreshing} onRefresh={()=>void refresh()}
   ListEmptyComponent={<View style={styles.empty}><AppText variant="title">No reels yet</AppText><AppText variant="body" muted>Published worker showcases will appear here.</AppText></View>}
   ListFooterComponent={footer}/>
 </View>;
};

type ReelCardProps={item:ReelFeedItem;active:boolean;token:string|null;onLike:()=>void;theme:any};
const ReelCard=({item,active,token,onLike,theme}:ReelCardProps):React.JSX.Element=><View style={[styles.card,{height:FEED_HEIGHT,backgroundColor:theme.colors.surface}]}>
 <Video source={{uri:videoUrl(item.videoPath),headers:token?{Authorization:'Bearer '+token}:undefined}} style={StyleSheet.absoluteFill} resizeMode="cover" paused={!active} repeat muted={false} playInBackground={false} playWhenInactive={false} controls={false}/>
 <View style={styles.scrim}/>
 <View style={styles.overlay}>
  <View style={styles.copy}>
   {item.title?<AppText variant="title" style={styles.white}>{item.title}</AppText>:null}
   {item.description?<AppText variant="body" style={styles.white}>{item.description}</AppText>:null}
   <AppText variant="caption" style={styles.meta}>{(item.durationSeconds?String(item.durationSeconds)+'s • ':'')+'Published '+(item.publishedAt?new Date(item.publishedAt).toLocaleDateString(undefined,{day:'numeric',month:'short'}):'recently')}</AppText>
  </View>
  <Pressable accessibilityRole="button" accessibilityLabel={item.liked?'Unlike reel':'Like reel'} onPress={onLike} style={[styles.likeButton,{backgroundColor:theme.colors.surfaceElevated}]}>
   <AppText variant="title" style={{color:item.liked?theme.colors.accent:theme.colors.textPrimary}}>{item.liked?'♥':'♡'}</AppText>
   <AppText variant="caption" style={{color:theme.colors.textPrimary,fontWeight:'800'}}>{item.likes}</AppText>
  </Pressable>
 </View>
</View>;

const styles=StyleSheet.create({root:{flex:1},card:{width:'100%',overflow:'hidden'},scrim:{...StyleSheet.absoluteFill,backgroundColor:'rgba(0,0,0,0.18)'},overlay:{...StyleSheet.absoluteFillObject,justifyContent:'flex-end',padding:20},copy:{paddingRight:64,gap:8},white:{color:'#FFFFFF'},meta:{color:'#FFFFFF',opacity:0.86},likeButton:{position:'absolute',right:16,bottom:28,width:56,minHeight:64,borderRadius:18,alignItems:'center',justifyContent:'center',gap:2},center:{flex:1,alignItems:'center',justifyContent:'center'},loadingText:{marginTop:12},errorBanner:{margin:12,padding:12,borderWidth:1,borderRadius:12},empty:{height:FEED_HEIGHT,alignItems:'center',justifyContent:'center',padding:24,gap:8},footer:{padding:20,alignItems:'center'}});
