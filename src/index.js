/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
// import {
//   useQuery,
//   QueryClient,
//   QueryClient,
//   QueryClientProvider,
// } from "@tanstack/react-query";
import {
  useQuery,
  QueryClient,
  // QueryClient,
  QueryClientProvider,
} from "./react-query-lite";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient();

function App() {
  const [postId, setPostId] = React.useState(-1);

  return (
    <QueryClientProvider client={queryClient}>
      <p>
        As you visit the posts below, you will notice them in a loading state
        the first time you load them. However, after you return to this list and
        click on any posts you have already visited again, you will see them
        load instantly and background refresh right before your eyes!{" "}
        <strong>
          (You may need to throttle your network speed to simulate longer
          loading sequences)
        </strong>
      </p>
      {postId > -1 ? (
        <Post postId={postId} setPostId={setPostId} />
      ) : (
        <Posts setPostId={setPostId} />
      )}
      {/* <ReactQueryDevtools initialIsOpen /> */}
    </QueryClientProvider>
  );
}

function usePosts() {
  return useQuery({
    queryKey: ["posts"], 
    queryFn:  async () => {
      const { data } = await axios.get(
        "https://jsonplaceholder.typicode.com/posts"
      );
      return data;
    },
    cacheTime:6000,
    staleTime:10000
  });
}

function Posts({ setPostId }) {
  // const queryClient = QueryClient();
  const { status, data, error, isFetching } = usePosts();
  console.log('posts====>');
  

  return (
    <div>
      <h1>Posts</h1>
      <div>
        {status === "loading" ? (
          "Loading..."
        ) : status === "error" ? (
          <span>Error: {error.message}</span>
        ) : (
          <>
            <div>
              {data.map((post) => (
                <p key={post.id}>
                  <a
                    onClick={() => setPostId(post.id)}
                    href="#"
                    // style={
                    //   // We can access the query data here to show bold links for
                    //   // ones that are cached
                    //   queryClient.getQueryData(["post", post.id])
                    //     ? {
                    //         fontWeight: "bold",
                    //         color: "green",
                    //       }
                    //     : {}
                    // }
                  >
                    {post.title}
                  </a>
                </p>
              ))}
            </div>
            <div>{isFetching ? "Background Updating..." : " "}</div>
          </>
        )}
      </div>
    </div>
  );
}

const getPostById = async (id) => {
  const { data } = await axios.get(
    `https://jsonplaceholder.typicode.com/posts/${id}`
  );
  return data;
};

function usePost(postId) {
  return useQuery( {
    queryKey: ["post", postId],
    queryFn:() => getPostById(postId) ,
    staleTime:10000,
    cacheTime:6000
  });
}

function Post({ postId, setPostId }) {
  const { status, data, error, isFetching } = usePost(postId);

  return (
    <div>
      <div>
        <a onClick={() => setPostId(-1)} href="#">
          Back
        </a>
      </div>
      {!postId || status === "loading" ? (
        "Loading..."
      ) : status === "error" ? (
        <span>Error: {error.message}</span>
      ) : (
        <>
          <h1>{data.title}</h1>
          <div>
            <p>{data.body}</p>
          </div>
          <div>{isFetching ? "Background Updating..." : " "}</div>
        </>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.createRoot(rootElement).render(<App />);
