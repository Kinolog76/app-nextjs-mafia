'use client';

import { useParams } from 'next/navigation';
import RoomClient from '@/features/room/RoomClient';

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  return <RoomClient roomId={params.roomId} />;
}
