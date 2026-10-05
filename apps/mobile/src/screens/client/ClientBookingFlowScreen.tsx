import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useWorkoTheme } from '../../design-system/ThemeProvider';
import { launchImageLibrary } from 'react-native-image-picker';
import { apiRequest } from '../../services/api/client';

type Props = { navigation: any; route: { params: { stage?: string; bookingId?: string } } };
const ORANGE='#FF6B00';
const stages=['list','details','tracking','complete','rate','chat','history','notifications','dispute'];

export function ClientBookingFlowScreen({navigation,route}:Props){
  const {theme}=useWorkoTheme();
  const stage=route.params?.stage ?? 'list';
  const bookingId=route.params?.bookingId;
  const [token,setToken]=useState<string|null>(null);
  const [bookings,setBookings]=useState<any[]>([]);
  const [booking,setBooking]=useState<any|null>(null);
  const [messages,setMessages]=useState<any[]>([]);
  const [notifications,setNotifications]=useState<any[]>([]);
  const [text,setText]=useState('');
  const [rating,setRating]=useState(5);
  const [comment,setComment]=useState('');
  const [dispute,setDispute]=useState('');
  const [attachmentUrls,setAttachmentUrls]=useState<string[]>([]);
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    const AsyncStorage=require('@react-native-async-storage/async-storage').default;
    const t=await AsyncStorage.getItem('worko.accessToken'); setToken(t);
    if(!t){setLoading(false);return;}
    try{
      if(stage==='notifications'){const r=await apiRequest('/bookings/notifications/list',{headers:{Authorization:'Bearer '+t}});const p=await r.json();setNotifications(p?.data??[]);}
      else if(bookingId){const r=await apiRequest('/bookings/'+bookingId,{headers:{Authorization:'Bearer '+t}});const p=await r.json();if(r.ok)setBooking(p?.data);}
      else {const r=await apiRequest('/bookings',{headers:{Authorization:'Bearer '+t}});const p=await r.json();setBookings(p?.data??[]);}
      if(stage==='chat'&&bookingId){const r=await apiRequest('/bookings/'+bookingId+'/chat',{headers:{Authorization:'Bearer '+t}});const p=await r.json();setMessages(p?.data??[]);}
    }catch{}finally{setLoading(false);}
  },[stage,bookingId]);
  useEffect(()=>{void load(); const timer=stage==='tracking'&&bookingId?setInterval(()=>void load(),5000):undefined; return()=>{if(timer)clearInterval(timer)}},[load,stage,bookingId]);

  const post=async(path:string,body?:any)=>{
    if(!token)return null;
    const r=await apiRequest(path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:body?JSON.stringify(body):undefined});
    const p=await r.json().catch(()=>({})); if(!r.ok)throw new Error(p?.message||'Request failed.'); return p;
  };
  const open=(s:string,id?:string)=>navigation.navigate('Bookings',{stage:s,bookingId:id});

  if(loading)return <View style={[styles.center,{backgroundColor:theme.background}]}><ActivityIndicator color={ORANGE}/><Text style={{color:theme.secondaryText}}>Loading…</Text></View>;
  const Card=({children}:{children:React.ReactNode})=><View style={[styles.card,{backgroundColor:theme.surface,borderColor:theme.border}]}>{children}</View>;
  const Header=({title}:{title:string})=><View style={styles.header}><Pressable onPress={()=>navigation.goBack()}><Text style={[styles.back,{color:theme.text}]}>‹</Text></Pressable><View><Text style={styles.brand}>Worko</Text><Text style={[styles.title,{color:theme.text}]}>{title}</Text></View></View>;
  const status=(booking?.status??'').replace(/_/g,' ');

  if(stage==='notifications')return <Page><Header title="Notifications"/>{notifications.map(n=><Card key={n.id}><Text style={[styles.badge,{color:ORANGE}]}>{n.type}</Text><Text style={[styles.cardTitle,{color:theme.text}]}>{n.title}</Text><Text style={{color:theme.secondaryText}}>{n.body}</Text><Text style={styles.small}>{new Date(n.createdAt).toLocaleString()}</Text></Card>)}{!notifications.length?<Card><Text style={{color:theme.text,fontWeight:'800'}}>You're all caught up.</Text></Card>:null}</Page>;

  if(stage==='list'||stage==='history')return <Page><Header title={stage==='history'?'Booking History':'My Bookings'}/>{bookings.map(b=><Card key={b.id}><Text style={[styles.badge,{color:ORANGE}]}>{b.status.replace(/_/g,' ')}</Text><Text style={[styles.cardTitle,{color:theme.text}]}>{b.requirement?.title}</Text><Text style={{color:theme.secondaryText}}>{b.requirement?.category?.name} · {b.requirement?.address}</Text><Text style={[styles.amount,{color:theme.text}]}>₹{Number(b.requirement?.payment?.amount??b.requirement?.budget??0).toFixed(0)}</Text><Pressable style={styles.primary} onPress={()=>open('details',b.id)}><Text style={styles.primaryText}>View Booking</Text></Pressable></Card>)}{!bookings.length?<Card><Text style={[styles.cardTitle,{color:theme.text}]}>No bookings yet</Text><Text style={{color:theme.secondaryText}}>Confirmed and completed Worko jobs will appear here.</Text></Card>:null}</Page>;

  if(!booking)return <Page><Card><Text style={{color:theme.text}}>Booking unavailable.</Text></Card></Page>;

  if(stage==='details')return <Page><Header title="Booking Details"/><Card><Text style={[styles.badge,{color:ORANGE}]}>{status}</Text><Text style={[styles.big,{color:theme.text}]}>{booking.requirement.title}</Text><Text style={{color:theme.secondaryText}}>{booking.requirement.description}</Text><Text style={styles.meta}>📍 {booking.requirement.address}</Text><Text style={styles.meta}>🗓 {booking.requirement.scheduledAt?new Date(booking.requirement.scheduledAt).toLocaleString():'As soon as possible'}</Text><Text style={styles.meta}>Worker: {booking.worker?.user?.email??'Assigned worker'}</Text><Text style={styles.meta}>Payment: {booking.paymentRecord?.status??booking.requirement.payment?.status??'HELD'}</Text></Card><Pressable style={styles.primary} onPress={()=>open('tracking',booking.id)}><Text style={styles.primaryText}>Live Tracking</Text></Pressable>{booking.status==='COMPLETED'?<Pressable style={styles.primary} onPress={()=>open('complete',booking.id)}><Text style={styles.primaryText}>Review Completion</Text></Pressable>:null}{booking.status==='CONFIRMED'?<Pressable style={styles.secondary} onPress={()=>post('/bookings/'+booking.id+'/cancel',{reason:'Cancelled by client'}).then(()=>load()).catch(e=>Alert.alert('Cancel failed',e.message))}><Text style={styles.secondaryText}>Cancel Booking</Text></Pressable>:null}<Pressable style={styles.secondary} onPress={()=>open('chat',booking.id)}><Text style={styles.secondaryText}>Open Chat</Text></Pressable><Pressable style={styles.secondary} onPress={()=>open('dispute',booking.id)}><Text style={styles.secondaryText}>Report a Dispute</Text></Pressable></Page>;

  if(stage==='tracking')return <Page><Header title="Live Tracking"/><Card><View style={styles.map}><Text style={styles.mapPin}>⌖</Text><Text style={styles.mapTitle}>{booking.status==='IN_PROGRESS'?'Worker is on the job':'Worker is heading to you'}</Text><Text style={styles.mapText}>{booking.requirement.address}</Text></View><Text style={[styles.big,{color:theme.text}]}>{status}</Text><Text style={{color:theme.secondaryText}}>This view refreshes automatically while the booking is active.</Text></Card><Pressable style={styles.primary} onPress={()=>open('chat',booking.id)}><Text style={styles.primaryText}>Chat with Worker</Text></Pressable></Page>;

  if(stage==='complete')return <Page><Header title="Work Completion"/><Card><Text style={[styles.big,{color:theme.text}]}>Work completed</Text><Text style={{color:theme.secondaryText}}>The worker submitted completion evidence. Confirm when everything looks correct.</Text><Text style={[styles.meta,{color:theme.text}]}>Payment release: {booking.paymentRecord?.status??'HELD'}</Text></Card><Pressable style={styles.primary} onPress={()=>post('/bookings/'+booking.id+'/confirm').then(()=>{Alert.alert('Confirmed','Worker payment has been released.');open('rate',booking.id)}).catch(e=>Alert.alert('Confirmation failed',e.message))}><Text style={styles.primaryText}>Confirm & Release Payment</Text></Pressable><Pressable style={styles.secondary} onPress={()=>open('dispute',booking.id)}><Text style={styles.secondaryText}>Something is wrong</Text></Pressable></Page>;

  if(stage==='rate')return <Page><Header title="Rate Your Worker"/><Card><Text style={[styles.big,{color:theme.text}]}>{'★'.repeat(rating)}</Text><View style={styles.row}>{[1,2,3,4,5].map(n=><Pressable key={n} onPress={()=>setRating(n)}><Text style={{fontSize:34,color:n<=rating?ORANGE:'#B9BEC7'}}>★</Text></Pressable>)}</View><TextInput value={comment} onChangeText={setComment} placeholder="Share your experience…" placeholderTextColor="#98A2B3" multiline style={[styles.input,{color:theme.text,borderColor:theme.border}]}/><Pressable style={styles.primary} onPress={()=>post('/bookings/'+booking.id+'/rating',{rating,comment}).then(()=>{Alert.alert('Thank you','Your review was submitted.');open('list')}).catch(e=>Alert.alert('Rating failed',e.message))}><Text style={styles.primaryText}>Submit Review</Text></Pressable></Card></Page>;

  if(stage==='chat')return <Page><Header title="Booking Chat"/><Card>{messages.map(m=><View key={m.id} style={[styles.message,{alignSelf:m.senderId===booking.clientId?'flex-end':'flex-start',backgroundColor:m.senderId===booking.clientId?ORANGE:theme.background}]}><Text style={{color:m.senderId===booking.clientId?'#FFF':theme.text}}>{m.content||'Attachment'}</Text>{m.attachmentUrls?.map((u:string)=><Pressable key={u} onPress={()=>void Linking.openURL(u)}><Text style={styles.link}>Attachment →</Text></Pressable>)}</View>)}{!messages.length?<Text style={{color:theme.secondaryText}}>Start the conversation with your worker.</Text>:null}<TextInput value={text} onChangeText={setText} placeholder="Message worker…" placeholderTextColor="#98A2B3" style={[styles.input,{color:theme.text,borderColor:theme.border}]}/><View style={styles.row}><Pressable style={styles.attach} onPress={()=>void launchImageLibrary({mediaType:'photo',selectionLimit:1}).then(async result=>{const asset=result.assets?.[0];if(!asset?.uri||!token)return;const form=new FormData();form.append('files',{uri:asset.uri,type:asset.type||'image/jpeg',name:asset.fileName||('chat-'+Date.now()+'.jpg')} as any);const r=await fetch('http://127.0.0.1:3000/api/v1/bookings/'+booking.id+'/chat/attachments',{method:'POST',headers:{Authorization:'Bearer '+token},body:form});const p=await r.json().catch(()=>({}));if(!r.ok)throw new Error(p?.message||'Attachment upload failed.');setAttachmentUrls(old=>[...old,...(p?.data?.attachments??[])]);}).catch(e=>Alert.alert('Attachment failed',e.message))}><Text style={styles.secondaryText}>＋ Photo</Text></Pressable><Pressable style={[styles.primary,{flex:1,marginLeft:8}]} onPress={()=>post('/bookings/'+booking.id+'/chat',{content:text,attachmentUrls}).then(()=>{setText('');setAttachmentUrls([]);void load()}).catch(e=>Alert.alert('Message failed',e.message))}><Text style={styles.primaryText}>Send Message{attachmentUrls.length?' + attachment':''}</Text></Pressable></View></Card></Page>;

  if(stage==='dispute')return <Page><Header title="Dispute Booking"/><Card><Text style={[styles.cardTitle,{color:theme.text}]}>What went wrong?</Text><TextInput value={dispute} onChangeText={setDispute} multiline placeholder="Describe the issue clearly…" placeholderTextColor="#98A2B3" style={[styles.input,styles.multiline,{color:theme.text,borderColor:theme.border}]}/><Pressable style={styles.primary} onPress={()=>post('/bookings/'+booking.id+'/disputes',{reason:'SERVICE_ISSUE',description:dispute}).then(()=>{Alert.alert('Dispute submitted','Worko support can now review this booking.');open('details',booking.id)}).catch(e=>Alert.alert('Dispute failed',e.message))}><Text style={styles.primaryText}>Submit Dispute</Text></Pressable></Card></Page>;

  return <Page><Card><Text style={[styles.cardTitle,{color:theme.text}]}>Booking lifecycle</Text><Text style={{color:theme.secondaryText}}>Booking status: {status}</Text></Card></Page>;

  function Page({children}:{children:React.ReactNode}){return <View style={[styles.page,{backgroundColor:theme.background}]}><ScrollView contentContainerStyle={styles.container}>{children}</ScrollView></View>}
}
const styles=StyleSheet.create({page:{flex:1},container:{padding:18,paddingBottom:40},center:{flex:1,alignItems:'center',justifyContent:'center'},header:{flexDirection:'row',gap:10,alignItems:'flex-start',marginBottom:18},back:{fontSize:36,lineHeight:36},brand:{fontSize:24,fontWeight:'900',color:ORANGE},title:{fontSize:24,fontWeight:'900'},card:{borderWidth:1,borderRadius:16,padding:16,marginBottom:12},badge:{fontSize:11,fontWeight:'900',marginBottom:8},cardTitle:{fontSize:17,fontWeight:'900',marginBottom:7},big:{fontSize:23,fontWeight:'900',marginBottom:8},meta:{fontSize:13,lineHeight:21,marginTop:8,color:'#6B7280'},amount:{fontSize:18,fontWeight:'900',marginTop:10},primary:{minHeight:50,borderRadius:13,backgroundColor:ORANGE,alignItems:'center',justifyContent:'center',marginBottom:10},primaryText:{color:'#FFF',fontWeight:'900'},secondary:{minHeight:50,borderWidth:1.5,borderColor:ORANGE,borderRadius:13,alignItems:'center',justifyContent:'center',marginBottom:10},secondaryText:{color:ORANGE,fontWeight:'900'},input:{minHeight:52,borderWidth:1,borderRadius:12,paddingHorizontal:13,marginTop:12,fontSize:14},multiline:{height:150,textAlignVertical:'top',paddingTop:12},row:{flexDirection:'row',justifyContent:'center',gap:6,marginVertical:10},map:{height:240,borderRadius:16,backgroundColor:'#E9EEF2',alignItems:'center',justifyContent:'center',marginBottom:16},mapPin:{fontSize:48,color:ORANGE},mapTitle:{fontSize:18,fontWeight:'900',color:'#101010',marginTop:8},mapText:{fontSize:13,color:'#667085',marginTop:5},message:{maxWidth:'82%',padding:11,borderRadius:14,marginBottom:8},attach:{minHeight:50,paddingHorizontal:15,borderWidth:1.5,borderColor:ORANGE,borderRadius:13,alignItems:'center',justifyContent:'center'},link:{color:ORANGE,fontWeight:'800',marginTop:6},small:{fontSize:11,color:'#98A2B3',marginTop:8}});
