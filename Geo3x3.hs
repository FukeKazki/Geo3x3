module Geo3x3
    ( encode'
    , decode'
    , encode
    , decode
    ) where

import qualified Data.ByteString.Char8 as B8
import qualified Data.ByteString.Lazy.Char8 as LB8
import qualified Data.ByteString.Builder as Builder
import qualified Control.Monad.RWS as RWS
import qualified Control.Monad.State as State
import Control.Monad (forM_, when)
import Data.Char (digitToInt)

type Encoder =  RWS.RWS () Builder.Builder (Double,Double,Double) -- (lat,lng,unit)
type Decoder = State.State (Double,Double,Int,Double) -- (lat,lng,level,unit)

encode' :: Double -> Double -> Int -> LB8.ByteString
encode' lat lng level = Builder.toLazyByteString $ snd $ RWS.evalRWS f () (lat,lng,0)
  where
    f :: Encoder ()
    f = if level < 1 then error "invalid level"
        else do
          if lng >= 0
            then RWS.tell $ Builder.char7 'E'
            else do
              RWS.tell $ Builder.char7 'W'
              RWS.modify' $ \(lat,lng,unit) -> (lat,lng+180,unit)
          RWS.modify' $ \(lat,lng,_) ->
            let lat' = 90 - lat -- lat 0:the North Pole,  180:the South Pole
                unit' = 180
            in (lat',lng,unit')
          forM_ [1..level-1] $ \_ -> do
            (lat,lng,unit) <- RWS.get
            let unit' = unit / 3
                x = truncate $ lng / unit'
                y = truncate $ lat / unit'
            RWS.tell $ Builder.char7 $ toEnum $ fromEnum '0' + x + y * 3 + 1
            let lng' = lng - (fromIntegral x) * unit'
                lat' = lat - (fromIntegral y) * unit'
            RWS.put (lat',lng',unit')


decode' :: B8.ByteString -> (Double, Double, Int, Double)
decode' code = State.execState f (0, 0, 0, 0)
  where
    f :: Decoder ()
    f = do
      if B8.null code then error "trying to decode empty data"
      else do
        let c = B8.index code 0
            (begin,flg) = case c of
              _ | c == '-' || c == 'W' -> (1,True)
              _ | c == '+' || c == 'E' -> (1,False)
              _ -> (0,False)
            unit = 180
            lat = 0
            lng = 0
            level = 1
            clean = B8.length code
        State.put (lat,lng,level,unit)
        let loop = \i -> do
            when (i < clean) $ do
              let n = digitToInt $ B8.index code i
              when (n > 0) $ do
                State.modify' $ \(lat,lng,level,unit) ->
                  let unit' = unit / 3
                      n' = n - 1
                      lng' = lng + (fromIntegral $ n' `mod` 3) * unit'
                      lat' = lat + (fromIntegral $ n' `div` 3) * unit'
                      level' = level +1
                  in (lat',lng',level',unit')
                loop $ i + 1
        loop begin
        State.modify' $ \(lat,lng,level,unit) ->
          let
            lat' = lat + unit / 2
            lng' = lng + unit / 2
            lat'' = 90 - lat'
            lng'' = if flg then lng' -180 else lng'
          in (lat'',lng'',level,unit)


encode :: Double -> Double -> Int -> String
encode lat lng level =  LB8.unpack $ encode' lat lng level

decode :: String -> (Double, Double, Int, Double)
decode = decode' . B8.pack
